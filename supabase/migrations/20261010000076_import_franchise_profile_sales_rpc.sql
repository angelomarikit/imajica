-- SECURITY DEFINER RPC: import franchise customer availed services / installments / products as sales.
-- Resolves client by phone_key (preferred) or full_name within branch — anon cannot read clients via RLS.
create or replace function public.import_franchise_profile_sales(p_rows jsonb)
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
  v_phone_key text;
  inserted_n int := 0;
  skipped_n int := 0;
  exists_id uuid;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'p_rows must be a json array');
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    begin
      v_branch := coalesce(
        nullif(r->>'branch_id', '')::uuid,
        '22222222-2222-2222-2222-222222222205'::uuid
      );
    exception when others then
      v_branch := '22222222-2222-2222-2222-222222222205'::uuid;
    end;

    v_client := null;
    begin
      v_client := nullif(r->>'client_id', '')::uuid;
    exception when others then
      v_client := null;
    end;

    if v_client is null then
      v_phone_key := nullif(r->>'phone_key', '');
      if v_phone_key is not null and length(v_phone_key) >= 10 then
        select c.id into v_client
        from public.clients c
        where right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = v_phone_key
        order by case when c.preferred_branch_id = v_branch then 0 else 1 end
        limit 1;
      end if;
    end if;

    if v_client is null and nullif(trim(coalesce(r->>'full_name', '')), '') is not null then
      select c.id into v_client
      from public.clients c
      where regexp_replace(lower(coalesce(c.full_name, '')), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(trim(r->>'full_name')), '[^a-z0-9]', '', 'g')
        and c.preferred_branch_id = v_branch
      limit 1;
    end if;

    if v_client is null then
      skipped_n := skipped_n + 1;
      continue;
    end if;

    v_invoice := nullif(trim(coalesce(r->>'invoice_number', '')), '');
    if v_invoice is null then
      skipped_n := skipped_n + 1;
      continue;
    end if;

    select s.id into exists_id
    from public.sales s
    where s.client_id = v_client
      and s.invoice_number = v_invoice
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
      coalesce(nullif(r->>'lead_source', ''), 'Migration'),
      nullif(r->>'contract_amount', '')::numeric
    );

    insert into public.sale_items (
      sale_id, item_type, item_id, name, quantity, unit_price, discount, line_total, unit_cost, sku,
      sessions_total, sessions_completed
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
      nullif(r->>'sku', ''),
      nullif(r->>'sessions_total', '')::int,
      nullif(r->>'sessions_completed', '')::int
    );

    insert into public.payments (
      sale_id, provider, payment_method, payment_status, payment_amount, payment_date
    ) values (
      v_sale_id,
      'migration',
      coalesce(nullif(r->>'payment_method', ''), 'cash'),
      case when coalesce(r->>'status', 'paid') = 'paid' then 'paid' else 'pending' end,
      coalesce(nullif(r->>'total_amount', '')::numeric, 0),
      coalesce(nullif(r->>'created_at', '')::timestamptz, now())
    );

    inserted_n := inserted_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', inserted_n, 'skipped', skipped_n);
end;
$$;

grant execute on function public.import_franchise_profile_sales(jsonb) to anon, authenticated, service_role;
