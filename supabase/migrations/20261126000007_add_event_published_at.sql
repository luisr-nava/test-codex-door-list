alter table public.events
  add column published_at timestamptz;

update public.events
set published_at = created_at
where status = 'published'
  and published_at is null;

create function public.set_event_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = now();
  end if;

  return new;
end;
$$;

create trigger set_event_published_at
before insert or update of status on public.events
for each row execute function public.set_event_published_at();
