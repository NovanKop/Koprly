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

        // Get users with streak rewards enabled
        const { data: users, error: usersError } = await supabase
            .from('notification_preferences')
            .select('user_id, streak_rewards')
            .eq('streak_rewards', true);

        if (usersError) throw usersError;

        const notifications = [];
        const today = new Date();

        for (const userPref of users || []) {
            // Check last 7 days to see if user stayed under budget each day
            let consecutiveDays = 0;

            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dateStr = checkDate.toISOString().split('T')[0];

                // Get total daily spending
                const { data: dailyTx } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', userPref.user_id)
                    .eq('type', 'expense')
                    .eq('date', dateStr);

                const dailySpending = dailyTx?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

                // Get user's total budget
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('total_budget, budget_period')
                    .eq('id', userPref.user_id)
                    .single();

                if (!profile || !profile.total_budget) break;

                // Calculate daily budget limit
                const dailyBudgetLimit = profile.budget_period === 'weekly'
                    ? profile.total_budget / 7
                    : profile.total_budget / 30;

                // Check if under budget
                if (dailySpending <= dailyBudgetLimit) {
                    consecutiveDays++;
                } else {
                    break; // Streak broken
                }
            }

            // Send notification for 3, 7, 14, or 30 day streaks
            const milestones = [3, 7, 14, 30];
            const milestone = milestones.find(m => consecutiveDays === m);

            if (milestone) {
                // Check if we already sent this milestone notification
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', userPref.user_id)
                    .eq('type', 'streak_reward')
                    .eq('metadata->>streak_days', milestone.toString())
                    .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
                    .single();

                if (!existing) {
                    const healthScore = Math.min(100, 70 + (milestone * 2));
                    let message = '';

                    if (milestone === 3) {
                        message = `Impressive! You've stayed under budget for 3 days straight. Your Financial Health is now ${healthScore}/100! 🚀`;
                    } else if (milestone === 7) {
                        message = `Amazing! A full week of staying under budget! Your Financial Health is ${healthScore}/100. Keep it up! 🌟`;
                    } else if (milestone === 14) {
                        message = `Incredible! Two weeks of financial discipline! Your Health Score is ${healthScore}/100. You're a budgeting pro! 💪`;
                    } else if (milestone === 30) {
                        message = `Outstanding! A full month of staying under budget! Your Financial Health Score is ${healthScore}/100. You're a financial champion! 🏆`;
                    }

                    const { error: notifError } = await supabase
                        .from('notifications')
                        .insert({
                            user_id: userPref.user_id,
                            type: 'streak_reward',
                            title: `${milestone}-Day Streak! 🎉`,
                            message,
                            metadata: {
                                streak_days: milestone,
                                health_score: healthScore,
                                deep_link: '/dashboard'
                            }
                        });

                    if (!notifError) {
                        notifications.push({ user_id: userPref.user_id, streak_days: milestone });
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                streak_rewards_sent: notifications.length,
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
