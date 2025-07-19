CREATE OR REPLACE VIEW public.app_global_stats_view AS
SELECT
    (SELECT COUNT(*) FROM public.students) AS total_students,
    COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawals,
    COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS total_balance
FROM
    public.transactions;