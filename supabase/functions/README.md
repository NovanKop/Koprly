# Smart Notification Engine - Edge Functions

This directory contains Supabase Edge Functions for the notification system.

## Functions

### 1. check-budget-alerts
**Trigger**: Called after expense transactions
**Purpose**: Sends budget warning at 80% and critical alert at 100% of monthly budget
**Schedule**: Real-time (via database trigger)

### 2. daily-summary
**Trigger**: CRON at 20:00 (8:00 PM) daily
**Purpose**: Sends daily spending summary with comparison to previous day
**Schedule**: `0 20 * * *` (8 PM every day)

### 3. check-streaks
**Trigger**: CRON at 23:00 (11:00 PM) daily
**Purpose**: Detects spending streaks (3, 7, 14, 30 days under budget) and sends rewards
**Schedule**: `0 23 * * *` (11 PM every day)

### 4. check-missing-logs
**Trigger**: CRON at 18:00 (6:00 PM) daily
**Purpose**: Reminds users who haven't logged any expenses today
**Schedule**: `0 18 * * *` (6 PM every day)

### 5. anomaly-detection
**Trigger**: Called after expense transactions
**Purpose**: Detects transactions > 3x daily average and sends alert
**Schedule**: Real-time (via database trigger)

## Deployment

Deploy all functions to Supabase:

```bash
# Deploy individual function
supabase functions deploy check-budget-alerts
supabase functions deploy daily-summary
supabase functions deploy check-streaks
supabase functions deploy check-missing-logs
supabase functions deploy anomaly-detection

# Or deploy all at once
supabase functions deploy
```

## CRON Configuration

The CRON jobs need to be configured in the Supabase dashboard under **Database > Cron Jobs** or via pg_cron extension.

For daily-summary (8:00 PM):
```sql
SELECT cron.schedule(
  'daily-summary-notifications',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-id.supabase.co/functions/v1/daily-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

For check-streaks (11:00 PM):
```sql
SELECT cron.schedule(
  'check-streaks-notifications',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-id.supabase.co/functions/v1/check-streaks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

For check-missing-logs (6:00 PM):
```sql
SELECT cron.schedule(
  'missing-log-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-id.supabase.co/functions/v1/check-missing-logs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

## Testing

Test functions locally:
```bash
supabase functions serve
```

Test a specific function:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/daily-summary' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

## Environment Variables

Make sure these are set in your Supabase project:
- `SUPABASE_URL`: Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-configured
