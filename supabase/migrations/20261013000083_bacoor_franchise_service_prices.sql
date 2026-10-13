-- Bacoor franchise service menu (from franchise price screenshots)
-- Aligns public.treatments prices/sessions/status + branch_treatments for Bacoor.

do $$
declare
  r record;
  v_id uuid;
  bacoor uuid := '22222222-2222-2222-2222-222222222206'::uuid;
begin
  for r in
    select * from (values
  ('IMAJICA AQUA'::text, 1::int, 1999::numeric, 'active'::text),
  ('MULTI VITAMINS DRIP', 1, 2500, 'active'),
  ('FREE MULTIVITAMIN DRIP', 2, 0, 'active'),
  ('IMAJICA CLEAR', 5, 15000, 'active'),
  ('IMAJICA CELEBRITY', 5, 15000, 'active'),
  ('IMAJICA CELEBRITY', 1, 4499, 'active'),
  ('IMAJICA GLOW', 1, 3499, 'active'),
  ('IMAJICA BRIGHT', 1, 3499, 'active'),
  ('IMAJICA DELUXE', 1, 4999, 'active'),
  ('DIODE UPPER LIP HAIR REMOVAL', 1, 499, 'active'),
  ('DIODE FULL FACE HAIR REMOVAL', 1, 1499, 'active'),
  ('DIODE UNDERARMS HAIR REMOVAL', 1, 1499, 'active'),
  ('DIODE HALF ARMS HAIR REMOVAL', 1, 1999, 'active'),
  ('DIODE FULL ARMS HAIR REMOVAL', 1, 2499, 'active'),
  ('BRAZILIAN', 1, 1999, 'active'),
  ('DIODE HALF LEGS HAIR REMOVAL', 1, 1999, 'active'),
  ('DIODE FULL LEGS HAIR REMOVAL', 1, 2999, 'active'),
  ('PIMPLE INJECT', 1, 250, 'inactive'),
  ('K-GLOW FACIAL', 1, 2499, 'active'),
  ('CHARCOAL LASER FACIAL', 1, 2499, 'active'),
  ('PICO LASER FACIAL', 1, 2499, 'inactive'),
  ('HYDRA FACIAL', 1, 2499, 'active'),
  ('OXYBRIGHT FACIAL', 1, 2500, 'active'),
  ('IMAJICA BRIGHT', 5, 12999, 'active'),
  ('IMAJICA GLOW', 5, 11999, 'active'),
  ('IMAJICA CLEAR BACK AREA', 5, 14999, 'active'),
  ('IMAJICA CLEAR CHEST AREA', 5, 14999, 'active'),
  ('BIO REVIVE (ACNE SCAR MANAGEMENT)', 2, 30000, 'active'),
  ('MESO DNA (ACNE SCAR MANAGEMENT)', 5, 30000, 'active'),
  ('MESO MELA', 5, 24999, 'inactive'),
  ('BIO MELA (MELASMA TREATMENT)', 2, 30000, 'active'),
  ('IMAJICA PREMIUM', 5, 17999, 'active'),
  ('IMAJICA REVIVE (ACNE SCAR MANAGEMENT)', 6, 25000, 'active'),
  ('VAMPIRE FACIAL (PRP)', 5, 20000, 'active'),
  ('IMAJICA BRIGHT UNDERARM', 8, 15000, 'active'),
  ('SYRINGOMA REMOVAL', 1, 1499, 'active'),
  ('LEMON BOTTLE', 3, 15000, 'active'),
  ('LEMON BOTTLE', 1, 5000, 'active'),
  ('EXILIS FACE AND NECK', 1, 1500, 'active'),
  ('EXILIS TUMMY', 1, 2500, 'active'),
  ('ADD-ONS L-CARN', 1, 500, 'active'),
  ('IMMUNITY DRIP', 1, 2000, 'active'),
  ('IMMUNITY DRIP (ADD-ON)', 1, 500, 'active'),
  ('CLEANING SURGICAL SITE', 1, 500, 'active'),
  ('EXIPRO GROIN', 7, 7000, 'active'),
  ('FLAWLESS UNDERARM', 10, 15000, 'active'),
  ('DIODE UPPER LIP', 10, 3000, 'active'),
  ('ADD-ONS COLLAGEN', 1, 500, 'active'),
  ('IMMUNITY DRIP', 5, 10000, 'active'),
  ('BARBIE BACK', 1, 3898, 'inactive'),
  ('TRIFECTA', 1, 10000, 'active'),
  ('BARBIE FACE', 1, 2999, 'active'),
  ('MESO WITH EXIPRO (ARMS)', 1, 2499, 'active'),
  ('MESO WITH EXIPRO (TUMMY)', 1, 3499, 'active'),
  ('CO2+MICRONEEDLING', 1, 5000, 'active'),
  ('MULTIVITAMINS DRIP 5+1', 6, 12500, 'active'),
  ('ADD-ONS VIT C', 1, 250, 'active'),
  ('ALARTOX', 1, 3999, 'active'),
  ('SCLERO THERAPY', 1, 6000, 'active'),
  ('DIODE HALF LEGS', 10, 15000, 'active'),
  ('SLENDER DRIP', 5, 10000, 'active'),
  ('WARTS REMOVAL', 1, 1499, 'active'),
  ('GLP', 4, 30000, 'active'),
  ('DIODE UNDERARM', 10, 10000, 'active'),
  ('SWEATOX', 1, 10000, 'active'),
  ('EXIPRO', 1, 1500, 'active'),
  ('SLENDER DRIP', 1, 2000, 'inactive'),
  ('FRACTIONAL LASER HALF LEGS', 5, 20000, 'active'),
  ('WHITENING UNDERARM', 1, 1499, 'active'),
  ('CHARCOAL LASER UA', 1, 1500, 'active'),
  ('CHARCOAL FACIAL', 5, 7500, 'active'),
  ('SKIN BOOSTER', 5, 25000, 'active'),
  ('ULTRAFORMER+LEMON BOTTLE', 1, 13000, 'active'),
  ('MILIA REMOVAL', 1, 1500, 'active'),
  ('TATTOO REMOVAL (2X2)', 1, 1499, 'active'),
  ('TATTOO REMOVAL 2X2', 4, 6000, 'active'),
  ('CHARCOAL LASER ELBOW PACKAGE', 5, 7500, 'active'),
  ('CHEMICAL PEELING ELBOW', 5, 12500, 'active'),
  ('CHARCOAL & CHEMICAL PEELING ELBOW', 5, 16000, 'active'),
  ('IMAJICA CLEAR (20%)', 5, 12000, 'active'),
  ('LEMON BOTTLE (20%)', 3, 12000, 'active'),
  ('MESOMELA (20%)', 6, 20000, 'active'),
  ('CHEMICAL PEEL AND CHARCOAL LASER', 5, 20000, 'active'),
  ('IMAJICA AQUA PACKAGE', 5, 4000, 'active'),
  ('IMAJICA CLEAR SINGLE', 1, 4400, 'active'),
  ('WARTS REMOVAL (LEGACY)', 1, 2500, 'inactive'),
  ('INTENSIVE UNDER ARM TREATMENT', 1, 2500, 'active'),
  ('WARTS REMOVAL 20%', 1, 2000, 'active'),
  ('IMAJICA CELEBRITY 20%', 6, 12000, 'active'),
  ('LB 15%', 2, 12750, 'active'),
  ('SLENDER 15%', 1, 1700, 'active'),
  ('ULTRAFORMER 20%', 1, 8000, 'active'),
  ('SKINTAG REMOVAL', 1, 1499, 'active'),
  ('MULTIVITAMINS 20%', 6, 10000, 'active'),
  ('ULTRAFORMER', 1, 10000, 'active'),
  ('MESOMELA I', 1, 5000, 'active'),
  ('AGE REVERSING DRIP', 1, 2000, 'active'),
  ('SCAR SMALL', 1, 2500, 'active'),
  ('SLIMMING DRIP', 4, 8000, 'active'),
  ('EXILIS TUMMY', 4, 10000, 'active'),
  ('IMAJICA CLEAR HALF PAYMENT', 1, 7500, 'inactive'),
  ('SLENDER TWO', 2, 4000, 'active'),
  ('MULTIVITAMINS DRIP 10+5', 15, 25000, 'active'),
  ('CO2 FRACTIONAL FACE', 1, 4000, 'active'),
  ('IMAJICA CELEBRITY', 3, 10000, 'inactive'),
  ('UA BRIGHT', 5, 10000, 'active'),
  ('IMAJICA CLEAR BALANCE FOR MS. JASMINE JADE CRUZ', 1, 7500, 'inactive'),
  ('SLIMMING ELITE', 5, 30000, 'active'),
  ('SLIMMING GLOW ELITE', 10, 50000, 'active'),
  ('RADIANCE GLOW FACE', 1, 10000, 'active'),
  ('WARTS BODY', 1, 7000, 'active'),
  ('FULL FACE DIODE', 10, 10000, 'active'),
  ('RADIANT LIFT', 1, 15000, 'active'),
  ('WHITENING BODY', 5, 8500, 'active'),
  ('REVIVE BALANCE', 3, 18000, 'active'),
  ('SKIN BOOSTER', 1, 5000, 'active'),
  ('WHITENING LASER', 5, 8500, 'active'),
  ('AGE REVERSING DRIP', 15, 20000, 'active'),
  ('IMMUNITY DRIP', 15, 20000, 'active'),
  ('HYDRA ELITE FACIAL', 1, 3500, 'active'),
  ('MICRONEEDLING', 1, 3000, 'active'),
  ('IMAJICA REVIVE 20%', 5, 20000, 'active'),
  ('PRP CO2', 1, 8000, 'active'),
  ('ANTI AGING', 1, 7000, 'active'),
  ('INTIMATE WHITENING', 8, 17999, 'active'),
  ('BUTT WHITENING PACKAGE', 5, 17999, 'active'),
  ('OXYELITE FACIAL', 1, 3500, 'active'),
  ('UA 20%', 8, 12000, 'active'),
  ('DIODE 20%', 5, 2400, 'active'),
  ('INTIMATE 20%', 5, 14400, 'active'),
  ('ACNE FACIAL', 1, 2500, 'active'),
  ('AGE REVERSING', 5, 10000, 'active'),
  ('WHITENING BOOSTER', 1, 500, 'active'),
  ('WHITENING BOOSTER', 5, 2000, 'active'),
  ('BRIGHT UNDERARM', 8, 15000, 'active'),
  ('FLAWLESS UA', 10, 15000, 'active'),
  ('BACKCHEST CLEAR', 5, 25000, 'active'),
  ('EXI FACE&NECK', 6, 7500, 'active'),
  ('MILLIA REMOVAL', 1, 1499, 'active'),
  ('MOLE REMOVAL', 1, 1499, 'active'),
  ('NECK', 1, 1499, 'active'),
  ('FACE AND NECK', 1, 2499, 'active'),
  ('CHEST', 1, 2499, 'active'),
  ('BACK', 1, 2999, 'active'),
  ('BRAZILIAN DIODE', 1, 1999, 'active')
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
