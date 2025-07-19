CREATE OR REPLACE VIEW public.student_balances_view AS
SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.nisn,
    s.class,
    s.teacher_id,
    s.parent_id,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END), 0) AS total_withdrawals,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END), 0) AS current_balance
FROM
    public.students s
LEFT JOIN
    public.transactions t ON s.id = t.student_id
GROUP BY
    s.id, s.name, s.nisn, s.class, s.teacher_id, s.parent_id;