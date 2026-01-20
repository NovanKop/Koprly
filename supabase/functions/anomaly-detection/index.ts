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

        // Get the transaction that triggered this (from request body)
        const { user_id, category_id, amount } = await req.json();

        if (!user_id || !category_id || !amount) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Check user's anomaly alert preference
        const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('anomaly_alerts')
            .eq('user_id', user_id)
            .single();

        if (!prefs?.anomaly_alerts) {
            return new Response(
                JSON.stringify({ success: true, message: 'Anomaly alerts disabled for user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get last 30 days of transactions for this category
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentTx, error: txError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user_id)
            .eq('category_id', category_id)
            .eq('type', 'expense')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

        if (txError) throw txError;

        // Calculate average
        const transactions = recentTx || [];
        if (transactions.length < 3) {
            // Not enough data to determine anomaly
            return new Response(
                JSON.stringify({ success: true, message: 'Insufficient data for anomaly detection' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const average = totalAmount / transactions.length;

        // Check if current transaction is > 3x average
        if (amount > average * 3) {
            // Get category name
            const { data: category } = await supabase
                .from('categories')
                .select('name')
                .eq('id', category_id)
                .single();

            // Create notification
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: user_id,
                    type: 'anomaly_alert',
                    title: '🔍 Unusual Spending Detected',
                    message: `We noticed an unusually large transaction in ${category?.name || 'this category'}. Was this a planned expense?`,
                    metadata: {
                        category_name: category?.name || 'Unknown',
                        category_id: category_id,
                        amount: amount,
                        average: average.toFixed(2),
                        deep_link: '/dashboard'
                    }
                });

            if (notifError) throw notifError;

            return new Response(
                JSON.stringify({
                    success: true,
                    anomaly_detected: true,
                    amount: amount,
                    average: average,
                    threshold: average * 3
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                anomaly_detected: false,
                amount: amount,
                average: average
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
