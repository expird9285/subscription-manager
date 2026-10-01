import type { User } from "../lib/types";

export type DiscordProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function upsertDiscordUser(db: D1Database, profile: DiscordProfile) {
  const user = await db
    .prepare(
      `INSERT INTO users (id, discord_id, username, display_name, avatar, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT (discord_id) DO UPDATE SET
         username = excluded.username,
         display_name = excluded.display_name,
         avatar = excluded.avatar,
         last_login_at = excluded.last_login_at
       RETURNING *`,
    )
    .bind(
      crypto.randomUUID(),
      profile.id,
      profile.username,
      profile.global_name ?? null,
      profile.avatar ?? null,
    )
    .first<User>();

  if (!user) {
    throw new Error("Failed to save user");
  }
  return user;
}

export function getUserByDiscordId(db: D1Database, discordId: string) {
  return db.prepare("SELECT * FROM users WHERE discord_id = ?").bind(discordId).first<User>();
}

export function displayNameOf(user: Pick<User, "display_name" | "username">) {
  return user.display_name || user.username;
}
