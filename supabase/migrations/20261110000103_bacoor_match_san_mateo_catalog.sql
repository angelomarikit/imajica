-- Align Bacoor franchise catalog with San Mateo (same names, sessions, prices).
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
    lower('MULTIVITAMIN DRIP 5+1'),
    lower('INTIMATE PACKAGE 3'),
    lower('SCLEROTHERAPY'),
    lower('CINDERELLA PACKAGE B'),
    lower('IMAJICA BIGLOW (BRIGHT)'),
    lower('CARBON BLACKDOLL'),
    lower('EXIPRO ARMS'),
    lower('EXIPRO TUMMY'),
    lower('EMSLIM TUMMY'),
    lower('EMSLIM ARMS'),
    lower('EXIPRO BRA LINE'),
    lower('EXIPRO LOVE HANDLE'),
    lower('BIO-REVIVE'),
    lower('BIO-MIEL 6'),
    lower('GLUTA PUSH'),
    lower('BOTOX TRIFECTA'),
    lower('SWEATOX'),
    lower('GLUTA PUSH PACKAGE'),
    lower('INTIMATE PACKAGE 1'),
    lower('IMAJICA BACK FACIAL'),
    lower('UNDEREYE FILLER'),
    lower('WARTS SKIN TAG'),
    lower('MULTIVITAMIN DRIP 10 + 5 PACKAGE'),
    lower('MULTIVITAMIN DRIP 20 + 15'),
    lower('MESO DNA'),
    lower('TATTOO REMOVAL'),
    lower('CHEMICAL PEEL (KNEE/ELBOW)'),
    lower('BLACKDOLL PACKAGE'),
    lower('CHEMICAL PEEL (NECK)'),
    lower('LEMON BOTTLE PACKAGES'),
    lower('LEMON BOTTLE MESO LIP'),
    lower('IMAJICA SLIM PACKAGE'),
    lower('PIMPLE INJECT'),
    lower('IMAJICA GLIM I SHOTS'),
    lower('LEMON BOTTLE PER SESSION'),
    lower('IMARICA SLIM (GLP)'),
    lower('HAPPY HOUR'),
    lower('CHEMICAL PEEL (ANKLE)'),
    lower('UNDERARM EXOSOME'),
    lower('BUTT WHITENING PACKAGE'),
    lower('IMARICA KELOID SCARS'),
    lower('CHIN FILLER'),
    lower('REJURAN S'),
    lower('WARTS FULL FACE AND NECK'),
    lower('ULTRAFORMER (GLOW AND LIFT)'),
    lower('KELOID REMOVAL'),
    lower('COG THREADS AND FILLER'),
    lower('ULTRAFORMER (2D / HIFU)'),
    lower('CHEMICAL PEEL (UNDERARM)'),
    lower('WARTS REMOVAL FACE & NECK'),
    lower('BIG WARTS REMOVAL FACE'),
    lower('BARBIE ARMS PER SESSION'),
    lower('ADD ON''S (L CARNATINE)'),
    lower('CHEMICAL PEEL (KNEE)'),
    lower('HAPPY HOUR + BLACKDOLL'),
    lower('PIMPLE INJECT (2X)'),
    lower('AQUA FACIAL'),
    lower('IMAJICA SLIM (LIPO) 5 + 3'),
    lower('VITAMIN C (ADD ON)'),
    lower('L-CARNATINE (ADD ON)'),
    lower('COLLAGEN (ADD ON)'),
    lower('B-COMPLEX (ADD ON)'),
    lower('IMAJICA SLIM (RETATRUITION)'),
    lower('REJURAN I ( UNDEREYE )'),
    lower('CHEMICAL PEEL (SLPE)'),
    lower('WARTS REMOVAL ( FACE, CHEST AND BACK )'),
    lower('UNDERARM EXOSOME'),
    lower('HIKO NOSE'),
    lower('MESOLIPO ARMS'),
    lower('BACK BLACKHEAD REMOVAL'),
    lower('WARTS & SKIN TAG REMOVAL'),
    lower('SKINTAG REMOVAL (2 AREA)'),
    lower('STEMCELL (ACU ONE)'),
    lower('CROWS FEET'),
    lower('OXYBRIGHT FACIAL'),
    lower('PINK GLOW (FACE)'),
    lower('BRAZILLIAN'),
    lower('MESO CHIN'),
    lower('FRACTIONAL HALF LEGS'),
    lower('OXYBRIGHT FACIAL'),
    lower('CHEST (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)'),
    lower('BACK (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)'),
    lower('IMMUNITY DRIP'),
    lower('PINE BOTTLE (10ML)'),
    lower('YUVENIS (HA FILLERS)'),
    lower('HIKO NOSE THREAD'),
    lower('NOSE THREAD'),
    lower('HYDRAFACIAL'),
    lower('OXYBRIGHT FACIAL'),
    lower('IMAJICA MESO DNA'),
    lower('IMAJICA INTIMATE 1'),
    lower('IMAJICA INTIMATE 2'),
    lower('IMAJICA BUTT WHITENING'),
    lower('MESO CHIN'),
    lower('MESO ARMS'),
    lower('HAPPY HOUR PROMO'),
    lower('PIMPLE INJECT'),
    lower('IMAJICA SLIM SPLIT LEVEL 2'),
    lower('HAPPY HOUR (OXYBRIGHT/ CARBON LASER)'),
    lower('UNDERARM EXOSOMES'),
    lower('PIMPLE INJECT'),
    lower('MESO SLIM LEGS CONTOUR'),
    lower('IMARCA SLIM (LVL 3)'),
    lower('MESOSLIM CHIN'),
    lower('GLUTA PUSH'),
    lower('WARTS FACE AND NECK'),
    lower('GLOW & LIFT PROMO'),
    lower('SKIN BOOSTER'),
    lower('WARTS (CHEST AND NAPE)'),
    lower('GLUTA COL PLACENTA'),
    lower('REJURAN 5 PER SESSION'),
    lower('ANESTHESIA'),
    lower('H-HOUR + RO + WARTS / HYDRO'),
    lower('STEMM CELL (ADD ON)'),
    lower('UNDERARM (DIODE CH. LASER)'),
    lower('WARTS'),
    lower('ULTOX (HIFU)'),
    lower('IMAJICA SLIM 5MG GLP1'),
    lower('IMARCA SLIM 2.5MG PER SESSION'),
    lower('IMARCA SCULPT'),
    lower('TCA CROSS PER SESSION'),
    lower('IMARCA REVIVE PER SESSION'),
    lower('DELETED RECORDS JULY'),
    lower('XIN1 SCAR PROTOCOL'),
    lower('COLLAGEN (ADD ON)'),
    lower('LIP FILLER'),
    lower('NEFERTITI BOTOX'),
    lower('TRIFECTA BOTOX'),
    lower('CAUTERY (NOSE)'),
    lower('BUTT WHITENING PACKAGE')
  ];

  -- Deactivate old Bacoor-only treatments not on the San Mateo list
  update public.treatments t
  set status = 'inactive',
      updated_at = now()
  where t.default_branch_id = bacoor
    and lower(t.name) <> all (keep_names);

  for r in
    select * from (values
  ('MULTIVITAMIN DRIP 5+1', 6, 12500, 'active'),
  ('INTIMATE PACKAGE 3', 10, 30000, 'active'),
  ('SCLEROTHERAPY', 1, 6000, 'active'),
  ('CINDERELLA PACKAGE B', 25, 30000, 'active'),
  ('IMAJICA BIGLOW (BRIGHT)', 5, 12000, 'active'),
  ('CARBON BLACKDOLL', 1, 2000, 'active'),
  ('EXIPRO ARMS', 10, 3500, 'active'),
  ('EXIPRO TUMMY', 10, 3500, 'active'),
  ('EMSLIM TUMMY', 10, 1500, 'active'),
  ('EMSLIM ARMS', 10, 1500, 'active'),
  ('EXIPRO BRA LINE', 10, 1500, 'active'),
  ('EXIPRO LOVE HANDLE', 10, 7500, 'active'),
  ('BIO-REVIVE', 2, 20000, 'active'),
  ('BIO-MIEL 6', 2, 30000, 'active'),
  ('GLUTA PUSH', 1, 500, 'active'),
  ('BOTOX TRIFECTA', 1, 15000, 'active'),
  ('SWEATOX', 1, 12500, 'active'),
  ('GLUTA PUSH PACKAGE', 10, 4000, 'active'),
  ('INTIMATE PACKAGE 1', 2, 15000, 'active'),
  ('IMAJICA BACK FACIAL', 5, 15000, 'active'),
  ('UNDEREYE FILLER', 1, 12500, 'active'),
  ('WARTS SKIN TAG', 1, 5000, 'active'),
  ('MULTIVITAMIN DRIP 10 + 5 PACKAGE', 15, 25000, 'active'),
  ('MULTIVITAMIN DRIP 20 + 15', 35, 50000, 'active'),
  ('MESO DNA', 5, 25000, 'active'),
  ('TATTOO REMOVAL', 1, 3000, 'active'),
  ('CHEMICAL PEEL (KNEE/ELBOW)', 1, 2500, 'active'),
  ('BLACKDOLL PACKAGE', 5, 7500, 'active'),
  ('CHEMICAL PEEL (NECK)', 1, 3500, 'active'),
  ('LEMON BOTTLE PACKAGES', 2, 15000, 'active'),
  ('LEMON BOTTLE MESO LIP', 2, 15000, 'active'),
  ('IMAJICA SLIM PACKAGE', 5, 60000, 'active'),
  ('PIMPLE INJECT', 1, 750, 'active'),
  ('IMAJICA GLIM I SHOTS', 1, 10000, 'active'),
  ('LEMON BOTTLE PER SESSION', 1, 5500, 'active'),
  ('IMARICA SLIM (GLP)', 4, 30000, 'active'),
  ('HAPPY HOUR', 1, 2500, 'active'),
  ('CHEMICAL PEEL (ANKLE)', 1, 4500, 'active'),
  ('UNDERARM EXOSOME', 5, 15000, 'active'),
  ('BUTT WHITENING PACKAGE', 5, 22000, 'active'),
  ('IMARICA KELOID SCARS', 5, 15000, 'active'),
  ('CHIN FILLER', 1, 10000, 'active'),
  ('REJURAN S', 1, 10000, 'active'),
  ('WARTS FULL FACE AND NECK', 1, 2000, 'active'),
  ('ULTRAFORMER (GLOW AND LIFT)', 1, 15000, 'active'),
  ('KELOID REMOVAL', 1, 2000, 'active'),
  ('COG THREADS AND FILLER', 1, 50000, 'active'),
  ('ULTRAFORMER (2D / HIFU)', 1, 5000, 'active'),
  ('CHEMICAL PEEL (UNDERARM)', 1, 2500, 'active'),
  ('WARTS REMOVAL FACE & NECK', 1, 6500, 'active'),
  ('BIG WARTS REMOVAL FACE', 1, 1000, 'active'),
  ('BARBIE ARMS PER SESSION', 1, 2500, 'active'),
  ('ADD ON''S (L CARNATINE)', 1, 500, 'active'),
  ('CHEMICAL PEEL (KNEE)', 5, 2500, 'active'),
  ('HAPPY HOUR + BLACKDOLL', 1, 4000, 'active'),
  ('PIMPLE INJECT (2X)', 1, 500, 'active'),
  ('AQUA FACIAL', 15, 12000, 'active'),
  ('IMAJICA SLIM (LIPO) 5 + 3', 6, 45000, 'active'),
  ('VITAMIN C (ADD ON)', 1, 500, 'active'),
  ('L-CARNATINE (ADD ON)', 1, 500, 'active'),
  ('COLLAGEN (ADD ON)', 1, 500, 'active'),
  ('B-COMPLEX (ADD ON)', 1, 500, 'active'),
  ('IMAJICA SLIM (RETATRUITION)', 4, 35000, 'active'),
  ('REJURAN I ( UNDEREYE )', 1, 15000, 'active'),
  ('CHEMICAL PEEL (SLPE)', 1, 2500, 'active'),
  ('WARTS REMOVAL ( FACE, CHEST AND BACK )', 1, 7500, 'active'),
  ('UNDERARM EXOSOME', 1, 10000, 'active'),
  ('HIKO NOSE', 1, 15000, 'active'),
  ('MESOLIPO ARMS', 1, 3500, 'active'),
  ('BACK BLACKHEAD REMOVAL', 1, 10000, 'active'),
  ('WARTS & SKIN TAG REMOVAL', 1, 12000, 'active'),
  ('SKINTAG REMOVAL (2 AREA)', 1, 4500, 'active'),
  ('STEMCELL (ACU ONE)', 1, 1000, 'active'),
  ('CROWS FEET', 1, 5000, 'active'),
  ('OXYBRIGHT FACIAL', 1, 7500, 'active'),
  ('PINK GLOW (FACE)', 1, 15000, 'active'),
  ('BRAZILLIAN', 10, 15000, 'active'),
  ('MESO CHIN', 1, 1500, 'active'),
  ('FRACTIONAL HALF LEGS', 5, 25000, 'active'),
  ('OXYBRIGHT FACIAL', 1, 2500, 'active'),
  ('CHEST (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)', 1, 2500, 'active'),
  ('BACK (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)', 1, 3000, 'active'),
  ('IMMUNITY DRIP', 1, 2000, 'active'),
  ('PINE BOTTLE (10ML)', 1, 4000, 'active'),
  ('YUVENIS (HA FILLERS)', 1, 10000, 'active'),
  ('HIKO NOSE THREAD', 1, 15000, 'active'),
  ('NOSE THREAD', 1, 2500, 'active'),
  ('HYDRAFACIAL', 5, 7500, 'active'),
  ('OXYBRIGHT FACIAL', 5, 7500, 'active'),
  ('IMAJICA MESO DNA', 5, 25000, 'active'),
  ('IMAJICA INTIMATE 1', 5, 20000, 'active'),
  ('IMAJICA INTIMATE 2', 10, 20000, 'active'),
  ('IMAJICA BUTT WHITENING', 10, 22000, 'active'),
  ('MESO CHIN', 1, 1500, 'active'),
  ('MESO ARMS', 1, 1500, 'active'),
  ('HAPPY HOUR PROMO', 1, 2500, 'active'),
  ('PIMPLE INJECT', 1, 750, 'active'),
  ('IMAJICA SLIM SPLIT LEVEL 2', 5, 35000, 'active'),
  ('HAPPY HOUR (OXYBRIGHT/ CARBON LASER)', 1, 4000, 'active'),
  ('UNDERARM EXOSOMES', 4, 25000, 'active'),
  ('PIMPLE INJECT', 1, 250, 'active'),
  ('MESO SLIM LEGS CONTOUR', 1, 5000, 'active'),
  ('IMARCA SLIM (LVL 3)', 4, 45000, 'active'),
  ('MESOSLIM CHIN', 1, 1500, 'active'),
  ('GLUTA PUSH', 1, 500, 'active'),
  ('WARTS FACE AND NECK', 1, 2000, 'active'),
  ('GLOW & LIFT PROMO', 1, 15000, 'active'),
  ('SKIN BOOSTER', 1, 15000, 'active'),
  ('WARTS (CHEST AND NAPE)', 1, 2000, 'active'),
  ('GLUTA COL PLACENTA', 1, 1000, 'active'),
  ('REJURAN 5 PER SESSION', 1, 15000, 'active'),
  ('ANESTHESIA', 1, 500, 'active'),
  ('H-HOUR + RO + WARTS / HYDRO', 1, 4500, 'active'),
  ('STEMM CELL (ADD ON)', 1, 1000, 'active'),
  ('UNDERARM (DIODE CH. LASER)', 1, 3000, 'active'),
  ('WARTS', 1, 1500, 'active'),
  ('ULTOX (HIFU)', 1, 15000, 'active'),
  ('IMAJICA SLIM 5MG GLP1', 1, 45000, 'active'),
  ('IMARCA SLIM 2.5MG PER SESSION', 1, 10000, 'active'),
  ('IMARCA SCULPT', 1, 10000, 'active'),
  ('TCA CROSS PER SESSION', 1, 5000, 'active'),
  ('IMARCA REVIVE PER SESSION', 1, 9000, 'active'),
  ('DELETED RECORDS JULY', 1, 12002, 'active'),
  ('XIN1 SCAR PROTOCOL', 1, 32030, 'active'),
  ('COLLAGEN (ADD ON)', 1, 500, 'active'),
  ('LIP FILLER', 1, 10000, 'active'),
  ('NEFERTITI BOTOX', 1, 5000, 'active'),
  ('TRIFECTA BOTOX', 1, 10000, 'active'),
  ('CAUTERY (NOSE)', 1, 4000, 'active'),
  ('BUTT WHITENING PACKAGE', 5, 22000, 'active')
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
  ('SECY FACE', 5, 15000, 'active'),
  ('SEXY CURVES', 5, 16000, 'active'),
  ('SEXY BACK', 5, 16000, 'active'),
  ('SELF LOVE GLOW UP', 1, 12500, 'active'),
  ('LEMON BOTTLE', 3, 15000, 'active'),
  ('SLENDER DRIP 25+10', 35, 50000, 'active'),
  ('AGE REVERSING DRIP 5+1', 6, 10000, 'active'),
  ('AGE REVERSING DRIP 10+4', 14, 20000, 'active'),
  ('AGE REVERSING DRIP 15+6', 21, 30000, 'active'),
  ('AGE REVERSING DRIP 25+10', 35, 50000, 'active'),
  ('MULTIVITAMIN DRIP 5+1', 6, 12500, 'active'),
  ('MULTIVITAMIN DRIP 10+5', 15, 25000, 'active'),
  ('MULTIVITAMIN DRIP 15+9', 24, 37500, 'active'),
  ('MULTIVITAMIN DRIP 20+15', 35, 50000, 'active')
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
