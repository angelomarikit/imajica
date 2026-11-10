import fs from 'fs'

function extractSanMateo(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const rows = []
  const re =
    /\{\s*name:\s*'((?:\\'|[^'])*)'\s*,\s*sessions:\s*(\d+)\s*,\s*branch:\s*'San Mateo, Rizal'\s*,\s*status:\s*'(active|inactive)'\s*,\s*price:\s*(\d+)\s*\}/g
  let m
  while ((m = re.exec(text))) {
    rows.push({
      name: m[1].replace(/\\'/g, "'"),
      sessions: Number(m[2]),
      status: m[3],
      price: Number(m[4]),
    })
  }
  return rows
}

function sqlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

const services = extractSanMateo('src/constants/serviceCatalogSeed.ts')
const packages = extractSanMateo('src/constants/packageCatalogSeed.ts')

const serviceValues = services
  .map(
    (r, i) =>
      `  (${sqlString(r.name)}, ${r.sessions}, ${r.price}, ${sqlString(r.status)})${i === services.length - 1 ? '' : ','}`,
  )
  .join('\n')

const packageValues = packages
  .map(
    (r, i) =>
      `  (${sqlString(r.name)}, ${r.sessions}, ${r.price}, ${sqlString(r.status)})${i === packages.length - 1 ? '' : ','}`,
  )
  .join('\n')

const sql = `-- Align Bacoor franchise catalog with San Mateo (same names, sessions, prices).
-- Replaces the older franchise screenshot menu from 20261013000083.

do $$
declare
  r record;
  v_id uuid;
  bacoor uuid := '22222222-2222-2222-2222-222222222206'::uuid;
  san_mateo uuid := '22222222-2222-2222-2222-222222222201'::uuid;
  keep_names text[];
begin
  keep_names := array[
${services.map((r) => `    lower(${sqlString(r.name)})`).join(',\n')}
  ];

  -- Deactivate old Bacoor-only treatments not on the San Mateo list
  update public.treatments t
  set status = 'inactive',
      updated_at = now()
  where t.default_branch_id = bacoor
    and lower(t.name) <> all (keep_names);

  for r in
    select * from (values
${serviceValues}
    ) as v(name, sessions, price, status)
  loop
    select t.id into v_id
    from public.treatments t
    where t.default_branch_id = bacoor
      and lower(t.name) = lower(r.name)
      and coalesce(t.sessions, 1) = r.sessions
    order by t.created_at nulls last
    limit 1;

    if v_id is null then
      select t.id into v_id
      from public.treatments t
      where regexp_replace(lower(t.name), '[^a-z0-9]', '', 'g') =
            regexp_replace(lower(r.name), '[^a-z0-9]', '', 'g')
        and coalesce(t.sessions, 1) = r.sessions
        and t.default_branch_id = bacoor
      order by t.created_at nulls last
      limit 1;
    end if;

    if v_id is null then
      v_id := gen_random_uuid();
      insert into public.treatments (
        id, name, description, duration_minutes, price, status, sessions,
        default_branch_id, available_globally
      ) values (
        v_id,
        r.name,
        'Bacoor menu aligned with San Mateo',
        greatest(30, r.sessions * 30),
        r.price,
        r.status,
        r.sessions,
        bacoor,
        false
      );
    else
      update public.treatments
      set price = r.price,
          status = r.status,
          sessions = r.sessions,
          duration_minutes = greatest(30, r.sessions * 30),
          default_branch_id = bacoor,
          available_globally = false,
          description = 'Bacoor menu aligned with San Mateo',
          updated_at = now()
      where id = v_id;
    end if;

    insert into public.branch_treatments (branch_id, treatment_id)
    values (bacoor, v_id)
    on conflict do nothing;
  end loop;

  -- Packages: clone San Mateo packages onto Bacoor
  for r in
    select * from (values
${packageValues}
    ) as v(name, sessions, price, status)
  loop
    select p.id into v_id
    from public.packages p
    where p.default_branch_id = bacoor
      and lower(p.name) = lower(r.name)
      and coalesce(p.sessions, 1) = r.sessions
    order by p.created_at nulls last
    limit 1;

    if v_id is null then
      v_id := gen_random_uuid();
      insert into public.packages (
        id, name, type, description, regular_price, sessions, validity_months,
        status, default_branch_id
      ) values (
        v_id,
        r.name,
        'package',
        'Bacoor package aligned with San Mateo',
        r.price,
        r.sessions,
        6,
        r.status,
        bacoor
      );
    else
      update public.packages
      set regular_price = r.price,
          status = r.status,
          sessions = r.sessions,
          default_branch_id = bacoor,
          updated_at = now()
      where id = v_id;
    end if;
  end loop;

  -- Also ensure San Mateo–tagged packages that exist only with san_mateo default get a Bacoor twin
  insert into public.packages (
    id, name, type, description, regular_price, sessions, validity_months,
    status, default_branch_id
  )
  select
    gen_random_uuid(),
    p.name,
    coalesce(p.type, 'package'),
    'Bacoor package aligned with San Mateo',
    p.regular_price,
    p.sessions,
    coalesce(p.validity_months, 6),
    p.status,
    bacoor
  from public.packages p
  where p.default_branch_id = san_mateo
    and not exists (
      select 1
      from public.packages b
      where b.default_branch_id = bacoor
        and lower(b.name) = lower(p.name)
        and coalesce(b.sessions, 1) = coalesce(p.sessions, 1)
    );
end $$;
`

fs.writeFileSync(
  'supabase/migrations/20261110000103_bacoor_match_san_mateo_catalog.sql',
  sql,
)
console.log(`Wrote migration: ${services.length} services, ${packages.length} packages`)
