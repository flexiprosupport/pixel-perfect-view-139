DO $$
DECLARE
  r record; v_qual text; v_check text; v_sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%has_role(auth.uid(), ''%''::text)%'
  LOOP
    v_qual := replace(replace(coalesce(r.qual,''),
      'has_role(auth.uid(), ''admin''::text)', 'has_role(auth.uid(), ''admin''::app_role)'),
      'has_role(auth.uid(), ''moderator''::text)', 'has_role(auth.uid(), ''moderator''::app_role)');
    v_check := replace(replace(coalesce(r.with_check,''),
      'has_role(auth.uid(), ''admin''::text)', 'has_role(auth.uid(), ''admin''::app_role)'),
      'has_role(auth.uid(), ''moderator''::text)', 'has_role(auth.uid(), ''moderator''::app_role)');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd, array_to_string(r.roles, ', '));
    IF coalesce(r.qual,'') <> '' THEN v_sql := v_sql || format(' USING (%s)', v_qual); END IF;
    IF coalesce(r.with_check,'') <> '' THEN v_sql := v_sql || format(' WITH CHECK (%s)', v_check); END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;