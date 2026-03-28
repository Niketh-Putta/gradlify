-- Activate the Feb 2026 sprint window and ensure it runs for 7 days.
INSERT INTO public.sprint_windows (id, start_at, end_at, is_active, description, updated_at)
VALUES (
  'founders-202602',
  '2026-02-01T00:00:00Z',
  '2026-02-08T23:59:59Z',
  true,
  'Founders Sprint — Feb 2026',
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  is_active = true,
  description = EXCLUDED.description,
  updated_at = now();

UPDATE public.sprint_windows
SET is_active = false,
    updated_at = now()
WHERE id <> 'founders-202602'
  AND is_active = true;
