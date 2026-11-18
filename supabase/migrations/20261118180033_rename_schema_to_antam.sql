DO $migration$
BEGIN
  -- Use the same transaction lock as the application when changing the schema name.
  PERFORM pg_advisory_xact_lock(1040354273);

  IF to_regnamespace('minhan') IS NOT NULL THEN
    IF to_regnamespace('antam') IS NOT NULL THEN
      RAISE EXCEPTION 'Both minhan and antam schemas exist';
    END IF;
    ALTER SCHEMA minhan RENAME TO antam;
  ELSIF to_regnamespace('antam') IS NULL THEN
    RAISE EXCEPTION 'The initial pharmacy schema has not been installed';
  END IF;
END;
$migration$;
