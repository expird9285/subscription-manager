export async function getState<T>(db: D1Database, key: string) {
  const row = await db
    .prepare("SELECT value, updated_at FROM app_state WHERE key = ?")
    .bind(key)
    .first<{ value: string; updated_at: string }>();

  if (!row) {
    return null;
  }

  try {
    return { value: JSON.parse(row.value) as T, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function setState(db: D1Database, key: string, value: unknown) {
  await db
    .prepare(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, JSON.stringify(value))
    .run();
}
