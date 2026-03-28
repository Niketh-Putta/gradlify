update public.exam_questions
set estimated_time_sec = greatest(
  30,
  least(240, ceil(coalesce(estimated_time_sec, 60) * 0.3))
)::int;
