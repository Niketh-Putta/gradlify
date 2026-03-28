-- Cache latest AI practice recommendation per user

create table if not exists public.ai_practice_recommendations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  inputs_hash text not null,
  recommendation_json jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_practice_recommendations_user_created_at_idx
  on public.ai_practice_recommendations (user_id, created_at desc);

alter table public.ai_practice_recommendations enable row level security;

-- Users can read their own recommendations
create policy "Users can view their own AI practice recommendations"
  on public.ai_practice_recommendations
  for select
  using (auth.uid() = user_id);
