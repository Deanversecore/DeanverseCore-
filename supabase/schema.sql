-- DeanVerse AI — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create table if not exists public.assistant_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.assistant_workspaces is
  'One private workspace snapshot per user: tasks, reminders, events, notes, memory, goals, routines, follow-ups.';

alter table public.assistant_workspaces enable row level security;

-- A user can only ever see or write their own workspace.
drop policy if exists "workspace_select_own" on public.assistant_workspaces;
create policy "workspace_select_own"
  on public.assistant_workspaces for select
  using (auth.uid() = user_id);

drop policy if exists "workspace_insert_own" on public.assistant_workspaces;
create policy "workspace_insert_own"
  on public.assistant_workspaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "workspace_update_own" on public.assistant_workspaces;
create policy "workspace_update_own"
  on public.assistant_workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workspace_delete_own" on public.assistant_workspaces;
create policy "workspace_delete_own"
  on public.assistant_workspaces for delete
  using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assistant_workspaces_touch on public.assistant_workspaces;
create trigger assistant_workspaces_touch
  before update on public.assistant_workspaces
  for each row execute function public.touch_updated_at();
