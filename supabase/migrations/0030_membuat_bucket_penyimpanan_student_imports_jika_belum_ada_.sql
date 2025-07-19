INSERT INTO storage.buckets (id, name, public)
VALUES ('student-imports', 'student-imports', FALSE)
ON CONFLICT (id) DO NOTHING;