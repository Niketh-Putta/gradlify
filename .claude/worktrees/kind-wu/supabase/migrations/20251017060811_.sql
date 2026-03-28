-- Fix security issue: Add search_path to upsert_readiness_scores function
CREATE OR REPLACE FUNCTION public.upsert_readiness_scores(rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  elem jsonb;
begin
  for elem in select * from jsonb_array_elements(rows)
  loop
    insert into public.readiness_scores (user_id, subtopic_id, score, updated_at)
    values (
      (elem->>'user_id')::uuid,
      (elem->>'subtopic_id')::uuid,
      (elem->>'score')::int,
      now()
    )
    on conflict (user_id, subtopic_id) do update
      set score = excluded.score, updated_at = now();
  end loop;
end;
$function$;;
