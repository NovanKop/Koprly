import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get all users with daily_summary preference enabled
        const { data: users, error: usersError } = await supabase
            .from('notification_preferences')
            .select('user_id, summary_time, daily_summary')
            .eq('daily_summary', true);

        if (usersError) throw usersError;

        const notifications = [];
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        for (const userPref of users || []) {
            // Get today's transactions
            const { data: todayTx, error: todayError } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('user_id', userPref.user_id)
                .eq('date', today);

            if (todayError) continue;

            // Get yesterday's transactions for comparison
            const { data: yesterdayTx } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('user_id', userPref.user_id)
                .eq('date', yesterday);

            // Calculate today's total
            const todayExpenses = todayTx?.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0) || 0;
            const yesterdayExpenses = yesterdayTx?.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0) || 0;

            // Calculate percentage difference
            let diffPercentage = 0;
            let isPositiveTrend = false;
            if (yesterdayExpenses > 0) {
                diffPercentage = ((yesterdayExpenses - todayExpenses) / yesterdayExpenses) * 100;
                isPositiveTrend = diffPercentage > 0;
            } else if (todayExpenses === 0) {
                isPositiveTrend = true;
                diffPercentage = 100;
            }

            // Create message
            let message = '';
            if (todayExpenses === 0) {
                message = "Great job! You didn't spend anything today. Your Financial Health is looking excellent! 🌟";
            } else if (isPositiveTrend) {
                message = `You spent $${todayExpenses.toFixed(0)} today. That's ${Math.abs(diffPercentage).toFixed(0)}% less than yesterday! Your Health Score just went up. Great job!`;
            } else {
                message = `You spent $${todayExpenses.toFixed(0)} today. That's ${Math.abs(diffPercentage).toFixed(0)}% more than yesterday. Keep an eye on your spending to stay on track.`;
            }

            // Create notification
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: userPref.user_id,
                    type: 'daily_summary',
                    title: '📊 Your Daily Summary',
                    message,
                    metadata: {
                        amount: todayExpenses,
                        diff_percentage: diffPercentage.toFixed(1),
                        health_score: isPositiveTrend ? 98 : 85,
                        deep_link: '/report'
                    }
                });

            if (!notifError) {
                notifications.push({ user_id: userPref.user_id, amount: todayExpenses });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                summaries_sent: notifications.length,
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
