-- Fix: clients.code is NOT NULL — set when creating report-import customers.
create or replace function public.import_clinic_report_sales(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_sale_id uuid;
  v_client uuid;
  v_branch uuid;
  v_invoice text;
  v_name text;
  v_name_key text;
  inserted_n int := 0;
  skipped_n int := 0;
  created_clients int := 0;
  exists_id uuid;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'p_rows must be a json array');
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    begin
      v_branch := nullif(r->>'branch_id', '')::uuid;
    exception when others then
      v_branch := null;
    end;
    if v_branch is null then
      skipped_n := skipped_n + 1;
      continue;
    end if;

    v_name := nullif(trim(coalesce(r->>'full_name', '')), '');
    if v_name is null then
      skipped_n := skipped_n + 1;
      continue;
    end if;
    v_name_key := regexp_replace(lower(v_name), '[^a-z0-9]', '', 'g');

    v_invoice := nullif(trim(coalesce(r->>'invoice_number', '')), '');
    if v_invoice is null then
      skipped_n := skipped_n + 1;
      continue;
    end if;

    select c.id into v_client
    from public.clients c
    where c.preferred_branch_id = v_branch
      and regexp_replace(lower(coalesce(c.full_name, '')), '[^a-z0-9]', '', 'g') = v_name_key
    order by c.created_at nulls last
    limit 1;

    if v_client is null then
      select c.id into v_client
      from public.clients c
      where regexp_replace(lower(coalesce(c.full_name, '')), '[^a-z0-9]', '', 'g') = v_name_key
      order by case when c.preferred_branch_id = v_branch then 0 else 1 end, c.created_at nulls last
      limit 1;
    end if;

    if v_client is null then
      v_client := gen_random_uuid();
      insert into public.clients (
        id, code, full_name, preferred_branch_id, status, admin_notes
      ) values (
        v_client,
        'RPT-' || substr(replace(v_client::text, '-', ''), 1, 10),
        v_name,
        v_branch,
        'active',
        'Created from clinic sales report import'
      );
      created_clients := created_clients + 1;
    end if;

    select s.id into exists_id
    from public.sales s
    where s.invoice_number = v_invoice
    limit 1;
    if exists_id is not null then
      skipped_n := skipped_n + 1;
      continue;
    end if;

    v_sale_id := gen_random_uuid();
    insert into public.sales (
      id, client_id, branch_id, staff_id, staff_name,
      subtotal, discount, tax, total_amount, status, created_at,
      invoice_number, payment_type, booking_ref, lead_source, contract_amount
    ) values (
      v_sale_id,
      v_client,
      v_branch,
      null,
      nullif(trim(coalesce(r->>'staff_name', '')), ''),
      coalesce(nullif(r->>'total_amount', '')::numeric, 0),
      0,
      0,
      coalesce(nullif(r->>'total_amount', '')::numeric, 0),
      coalesce(nullif(r->>'status', ''), 'paid'),
      coalesce(nullif(r->>'created_at', '')::timestamptz, now()),
      v_invoice,
      coalesce(nullif(r->>'payment_type', ''), 'Full Payment'),
      coalesce(nullif(r->>'booking_ref', ''), v_invoice),
      coalesce(nullif(r->>'lead_source', ''), 'Clinic Report'),
      nullif(r->>'contract_amount', '')::numeric
    );

    insert into public.sale_items (
      sale_id, item_type, item_id, name, quantity, unit_price, discount, line_total, unit_cost, sku
    ) values (
      v_sale_id,
      coalesce(nullif(r->>'item_type', ''), 'service'),
      null,
      coalesce(nullif(trim(r->>'item_name'), ''), 'Item'),
      greatest(1, coalesce(nullif(r->>'quantity', '')::int, 1)),
      coalesce(nullif(r->>'unit_price', '')::numeric, coalesce(nullif(r->>'total_amount', '')::numeric, 0)),
      0,
      coalesce(nullif(r->>'line_total', '')::numeric, coalesce(nullif(r->>'total_amount', '')::numeric, 0)),
      0,
      nullif(r->>'sku', '')
    );

    insert into public.payments (
      sale_id, provider, payment_method, payment_status, payment_amount, payment_date
    ) values (
      v_sale_id,
      'clinic_report',
      coalesce(nullif(r->>'payment_method', ''), 'cash'),
      case when coalesce(r->>'status', 'paid') = 'paid' then 'paid' else 'pending' end,
      coalesce(nullif(r->>'total_amount', '')::numeric, 0),
      coalesce(nullif(r->>'created_at', '')::timestamptz, now())
    );

    inserted_n := inserted_n + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted', inserted_n,
    'skipped', skipped_n,
    'created_clients', created_clients
  );
end;
$$;
