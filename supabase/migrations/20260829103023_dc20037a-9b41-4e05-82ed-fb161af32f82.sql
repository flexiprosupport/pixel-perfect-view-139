DO $$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE (coalesce(qual,'') || coalesce(with_check,'')) ~ 'has_role\([^()]*''::text\)'
  LOOP
    v_qual := regexp_replace(coalesce(r.qual,''), 'has_role\(([^()]*), *''([a-z_]+)''::text\)', 'has_role(\1, ''\2''::app_role)', 'g');
    v_check := regexp_replace(coalesce(r.with_check,''), 'has_role\(([^()]*), *''([a-z_]+)''::text\)', 'has_role(\1, ''\2''::app_role)', 'g');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd,
      array_to_string(r.roles, ', '));

    IF coalesce(r.qual,'') <> '' THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF coalesce(r.with_check,'') <> '' THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END $$;