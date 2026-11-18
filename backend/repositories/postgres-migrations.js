import { readFile } from 'node:fs/promises';

const migrations = new URL('../../supabase/migrations/', import.meta.url);

export async function initializePostgresSchema(store) {
  const [initial, rename] = await Promise.all([
    readFile(new URL('20261118000100_minhan.sql', migrations), 'utf8'),
    readFile(new URL('20261118180033_rename_schema_to_antam.sql', migrations), 'utf8'),
  ]);

  await store.transaction(async () => {
    const { present } = await store.one(
      "SELECT to_regnamespace('antam') IS NOT NULL AS present",
    );
    if (!present) {
      // The initial migration has its own transaction when run directly.
      await store.migrate(initial.replace(/^(BEGIN|COMMIT);\r?$/gm, ''));
    }
    await store.migrate(rename);
  });
}
