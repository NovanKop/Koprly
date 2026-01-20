import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BudgetCheckResult {
    userId: string;
    categoryId: string;
    categoryName: string;
    currentSpend: number;
    budgetLimit: number;
    percentage: number;
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get current month's start and end dates
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Get all categories with budgets
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('id, name, monthly_budget, user_id')
            .not('monthly_budget', 'is', null)
            .gt('monthly_budget', 0);

        if (catError) throw catError;

        const notifications = [];

        // Check each category's spending
        for (const category of categories || []) {
            // Get total spending for this category this month
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('category_id', category.id)
                .eq('type', 'expense')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (txError) continue;

            const currentSpend = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
            const percentage = (currentSpend / category.monthly_budget) * 100;

            // Check user's notification preferences
            const { data: prefs } = await supabase
                .from('notification_preferences')
                .select('budget_alerts')
                .eq('user_id', category.user_id)
                .single();

            if (!prefs?.budget_alerts) continue;

            // Check if we should send a notification (80% or 100%)
            let notificationType = null;
            let title = '';
            let message = '';

            if (percentage >= 100) {
                // Check if we already sent a 100% notification
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', category.user_id)
                    .eq('type', 'budget_critical')
                    .eq('metadata->>category_name', category.name)
                    .gte('created_at', startOfMonth)
                    .single();

                if (!existing) {
                    notificationType = 'budget_critical';
                    title = 'Budget Limit Reached! 🚨';
                    message = `Ouch! You've officially hit your limit for ${category.name}. Time to review your spending for today.`;
                }
            } else if (percentage >= 80) {
                // Check if we already sent an 80% notification
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', category.user_id)
                    .eq('type', 'budget_warning')
                    .eq('metadata->>category_name', category.name)
                    .gte('created_at', startOfMonth)
                    .single();

                if (!existing) {
                    notificationType = 'budget_warning';
                    title = 'Budget Warning ⚠️';
                    message = `Heads up! You've used ${percentage.toFixed(0)}% of your ${category.name} budget. Maybe slow down a bit to stay safe until month-end?`;
                }
            }

            // Create notification if needed
            if (notificationType) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: category.user_id,
                        type: notificationType,
                        title,
                        message,
                        metadata: {
                            category_name: category.name,
                            category_id: category.id,
                            amount: currentSpend,
                            percentage: percentage.toFixed(1),
                            deep_link: '/budget'
                        }
                    });

                if (!notifError) {
                    notifications.push({ category: category.name, type: notificationType, percentage });
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                notifications_sent: notifications.length,
                details: notifications
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
