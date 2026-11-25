-- The organizer chooses the event state directly in the event form.
-- Published events may be created before ticket types are configured.
drop trigger if exists events_require_ticket_type_when_published on public.events;
drop trigger if exists published_events_require_ticket_type on public.tickets_types;

drop policy if exists "Authenticated users can create their own draft events" on public.events;
create policy "Authenticated users can create their own events"
on public.events
for insert
to authenticated
with check (owner_id = (select auth.uid()));
