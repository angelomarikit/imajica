-- Marketing → clinic handoffs (staff / clinic manager inbox)

alter table public.marketing_leads
  add column if not exists handoff_status text,
  add column if not exists handoff_note text,
  add column if not exists handoff_sent_at timestamptz,
  add column if not exists handoff_seen_at timestamptz,
  add column if not exists handoff_resolved_at timestamptz,
  add column if not exists handoff_resolved_by uuid references public.profiles (id);

alter table public.marketing_leads
  drop constraint if exists marketing_leads_handoff_status_check;

alter table public.marketing_leads
  add constraint marketing_leads_handoff_status_check check (
    handoff_status is null
    or handoff_status in ('sent', 'seen', 'booked', 'no_answer', 'declined')
  );

create index if not exists marketing_leads_handoff_branch_idx
  on public.marketing_leads (branch_id, handoff_status)
  where handoff_status is not null;

comment on column public.marketing_leads.handoff_status is
  'Clinic handoff: sent → seen → booked | no_answer | declined';

-- Staff can read/update handoffs for their branch; Marketing keeps full access
drop policy if exists marketing_leads_access on public.marketing_leads;
drop policy if exists marketing_leads_marketing_all on public.marketing_leads;
drop policy if exists marketing_leads_staff_handoffs_select on public.marketing_leads;
drop policy if exists marketing_leads_staff_handoffs_update on public.marketing_leads;

create policy marketing_leads_marketing_all on public.marketing_leads
  for all to authenticated
  using (public.can_access_marketing())
  with check (public.can_access_marketing());

create policy marketing_leads_staff_handoffs_select on public.marketing_leads
  for select to authenticated
  using (
    handoff_status is not null
    and branch_id is not null
    and (
      public.is_hq()
      or branch_id in (select public.user_branch_ids())
    )
  );

create policy marketing_leads_staff_handoffs_update on public.marketing_leads
  for update to authenticated
  using (
    handoff_status is not null
    and branch_id is not null
    and (
      public.is_hq()
      or branch_id in (select public.user_branch_ids())
    )
  )
  with check (
    handoff_status is not null
    and branch_id is not null
    and (
      public.is_hq()
      or branch_id in (select public.user_branch_ids())
    )
  );
