-- Merge-safe customer migration helper (HQ / authenticated only).
-- Used by scripts/run-apply-customer-migration.mjs — fill blanks only, no duplicates.

CREATE OR REPLACE FUNCTION public.apply_customer_migration_batch(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_id uuid;
  v_full_name text;
  v_phone text;
  v_email text;
  v_gender text;
  v_birth date;
  v_address text;
  v_branch uuid;
  v_notes text;
  v_spent numeric;
  v_visits int;
  v_phone_key text;
  v_email_key text;
  v_name_key text;
  match_id uuid;
  updated_n int := 0;
  inserted_n int := 0;
  skipped_n int := 0;
  name_n int;
  new_code text;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'p_rows must be a json array');
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_id := NULLIF(r->>'id', '')::uuid;
    v_full_name := NULLIF(trim(COALESCE(r->>'full_name', '')), '');
    IF v_full_name IS NULL THEN
      skipped_n := skipped_n + 1;
      CONTINUE;
    END IF;

    v_phone := NULLIF(trim(COALESCE(r->>'phone', '')), '');
    v_email := lower(NULLIF(trim(COALESCE(r->>'email', '')), ''));
    v_gender := NULLIF(lower(trim(COALESCE(r->>'gender', ''))), '');
    IF v_gender NOT IN ('female', 'male') THEN v_gender := NULL; END IF;
    BEGIN
      v_birth := NULLIF(r->>'birthdate', '')::date;
    EXCEPTION WHEN others THEN
      v_birth := NULL;
    END;
    v_address := NULLIF(trim(COALESCE(r->>'address', '')), '');
    BEGIN
      v_branch := NULLIF(r->>'preferred_branch_id', '')::uuid;
    EXCEPTION WHEN others THEN
      v_branch := NULL;
    END;
    v_notes := NULLIF(trim(COALESCE(r->>'admin_notes', '')), '');
    v_spent := COALESCE(NULLIF(r->>'total_spent', '')::numeric, 0);
    v_visits := COALESCE(NULLIF(r->>'total_visits', '')::int, 0);
    v_phone_key := NULLIF(r->>'phone_key', '');
    v_email_key := NULLIF(lower(trim(COALESCE(r->>'email_key', ''))), '');
    v_name_key := NULLIF(r->>'name_key', '');

    match_id := NULL;

    IF v_phone_key IS NOT NULL AND length(v_phone_key) >= 10 THEN
      SELECT c.id INTO match_id
      FROM public.clients c
      WHERE right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = v_phone_key
      LIMIT 1;
    END IF;

    IF match_id IS NULL AND v_email_key IS NOT NULL THEN
      SELECT c.id INTO match_id
      FROM public.clients c
      WHERE lower(coalesce(c.email, '')) = v_email_key
      LIMIT 1;
    END IF;

    IF match_id IS NULL AND v_name_key IS NOT NULL THEN
      SELECT count(*)::int INTO name_n
      FROM public.clients c
      WHERE regexp_replace(lower(regexp_replace(coalesce(c.full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\s', '', 'g') = v_name_key;

      IF name_n = 1 THEN
        SELECT c.id INTO match_id
        FROM public.clients c
        WHERE regexp_replace(lower(regexp_replace(coalesce(c.full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\s', '', 'g') = v_name_key
        LIMIT 1;
      ELSIF name_n > 1 THEN
        skipped_n := skipped_n + 1;
        CONTINUE;
      END IF;
    END IF;

    IF match_id IS NOT NULL THEN
      UPDATE public.clients c SET
        email = CASE WHEN nullif(trim(coalesce(c.email, '')), '') IS NULL THEN v_email ELSE c.email END,
        phone = CASE WHEN nullif(trim(coalesce(c.phone, '')), '') IS NULL THEN v_phone ELSE c.phone END,
        date_of_birth = CASE WHEN c.date_of_birth IS NULL THEN v_birth ELSE c.date_of_birth END,
        gender = CASE
          WHEN coalesce(c.gender, 'prefer_not_to_say') IN ('prefer_not_to_say', '') AND v_gender IS NOT NULL THEN v_gender
          ELSE c.gender
        END,
        address = CASE WHEN nullif(trim(coalesce(c.address, '')), '') IS NULL THEN v_address ELSE c.address END,
        preferred_branch_id = CASE WHEN c.preferred_branch_id IS NULL THEN v_branch ELSE c.preferred_branch_id END,
        admin_notes = CASE WHEN nullif(trim(coalesce(c.admin_notes, '')), '') IS NULL THEN v_notes ELSE c.admin_notes END,
        total_spent = GREATEST(coalesce(c.total_spent, 0), coalesce(v_spent, 0)),
        total_visits = GREATEST(coalesce(c.total_visits, 0), coalesce(v_visits, 0)),
        updated_at = now()
      WHERE c.id = match_id;
      updated_n := updated_n + 1;
    ELSE
      new_code := 'MJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      INSERT INTO public.clients (
        id, code, full_name, email, phone, date_of_birth, gender, address,
        preferred_branch_id, status, is_vip, registered_at, total_visits, total_spent, admin_notes
      ) VALUES (
        coalesce(v_id, gen_random_uuid()),
        new_code,
        v_full_name,
        v_email,
        v_phone,
        v_birth,
        coalesce(v_gender, 'prefer_not_to_say'),
        v_address,
        v_branch,
        'active',
        false,
        now(),
        coalesce(v_visits, 0),
        coalesce(v_spent, 0),
        v_notes
      );
      inserted_n := inserted_n + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'updated', updated_n,
    'inserted', inserted_n,
    'skipped', skipped_n
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_customer_migration_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_customer_migration_batch(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_migration_batch(jsonb) TO service_role;
