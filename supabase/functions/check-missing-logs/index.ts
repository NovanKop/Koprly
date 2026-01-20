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

        // Get users with missing log alerts enabled
        const { data: users, error: usersError } = await supabase
            .from('notification_preferences')
            .select('user_id, missing_log_alerts')
            .eq('missing_log_alerts', true);

        if (usersError) throw usersError;

        const notifications = [];
        const today = new Date().toISOString().split('T')[0];

        for (const userPref of users || []) {
            // Check if user has logged any transactions today
            const { data: todayTx, error: txError } = await supabase
                .from('transactions')
                .select('id')
                .eq('user_id', userPref.user_id)
                .eq('date', today)
                .limit(1);

            if (txError) continue;

            // If no transactions logged today, send reminder
            if (!todayTx || todayTx.length === 0) {
                // Check if we already sent a reminder today
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', userPref.user_id)
                    .eq('type', 'missing_log')
                    .gte('created_at', new Date().toISOString().split('T')[0])
                    .single();

                if (!existing) {
                    const { error: notifError } = await supabase
                        .from('notifications')
                        .insert({
                            user_id: userPref.user_id,
                            type: 'missing_log',
                            title: '📝 Daily Log Reminder',
                            message: "You haven't recorded today's expenses yet. Take 1 minute to keep your data accurate!",
                            metadata: {
                                deep_link: '/dashboard'
                            }
                        });

                    if (!notifError) {
                        notifications.push({ user_id: userPref.user_id });
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                reminders_sent: notifications.length,
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
