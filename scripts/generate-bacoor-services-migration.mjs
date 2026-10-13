import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Load TS seed via dynamic import through vite-node isn't available — parse the TS file.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(ROOT, 'src/constants/bacoorServiceCatalogSeed.ts'), 'utf8')
const block = src.match(/export const BACOOR_SERVICE_CATALOG_SEED[\s\S]*?= \[([\s\S]*?)\]\s*\n/)
if (!block) throw new Error('seed block not found')

const rows = []
const re =
  /name:\s*'((?:\\'|[^'])*)'\s*,\s*sessions:\s*(\d+)\s*,\s*branch:\s*BACOOR_BRANCH\s*,\s*status:\s*'(active|inactive)'\s*,\s*price:\s*(\d+)/g
let m
while ((m = re.exec(block[1]))) {
  rows.push({
    name: m[1].replace(/\\'/g, "'"),
    sessions: Number(m[2]),
    status: m[3],
    price: Number(m[4]),
  })
}

const BACOOR = '22222222-2222-2222-2222-222222222206'
function esc(s) {
  return String(s).replace(/'/g, "''")
}
const values = rows
  .map((r) => `('${esc(r.name)}', ${r.sessions}, ${r.price}, '${r.status}')`)
  .join(',\n  ')

const sql = `-- Bacoor franchise service menu (from franchise price screenshots)
-- Aligns public.treatments prices/sessions/status + branch_treatments for Bacoor.

do $$
declare
  r record;
  v_id uuid;
  bacoor uuid := '${BACOOR}'::uuid;
begin
  for r in
    select * from (values
  ${values}
    ) as v(name text, sessions int, price numeric, status text)
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
        and (t.default_branch_id = bacoor or t.default_branch_id is null)
      order by case when t.default_branch_id = bacoor then 0 else 1 end, t.created_at nulls last
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
        'Bacoor franchise menu',
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
          default_branch_id = bacoor,
          available_globally = false,
          updated_at = now()
      where id = v_id;
    end if;

    insert into public.branch_treatments (branch_id, treatment_id)
    values (bacoor, v_id)
    on conflict do nothing;
  end loop;
end $$;
`

const out = path.join(ROOT, 'supabase/migrations/20261013000083_bacoor_franchise_service_prices.sql')
fs.writeFileSync(out, sql)
console.log(JSON.stringify({ rows: rows.length, out }, null, 2))
