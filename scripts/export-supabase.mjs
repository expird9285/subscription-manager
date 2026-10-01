#!/usr/bin/env node
// One-off migration: reads users, subscriptions and notification logs from the old Supabase
// project and writes idempotent SQL for D1.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run export:supabase
//   npx wrangler d1 execute DB --remote --file=supabase-export.sql
//
// Users are matched by Discord ID, so it is safe to run before or after the first login on
// the new app, and running the generated SQL twice does not duplicate anything.

import { writeFile } from "node:fs/promises";

const OUTPUT = process.argv[2] ?? "supabase-export.sql";
const PAGE_SIZE = 1000;

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const headers = { apikey: key, authorization: `Bearer ${key}` };

async function getJson(path) {
  const response = await fetch(`${url}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const data = await getJson(`/auth/v1/admin/users?page=${page}&per_page=${PAGE_SIZE}`);
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < PAGE_SIZE) {
      return users;
    }
  }
}

async function listTable(table, order) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const batch = await getJson(
      `/rest/v1/${table}?select=*&order=${order}&limit=${PAGE_SIZE}&offset=${offset}`,
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }
}

const isSnowflake = (value) => typeof value === "string" && /^\d{5,25}$/.test(value);

function discordIdOf(user) {
  const identity = user.identities?.find((item) => item.provider === "discord");
  const candidates = [
    identity?.identity_data?.provider_id,
    identity?.identity_data?.sub,
    identity?.provider_id,
    identity?.id,
    user.user_metadata?.provider_id,
    user.user_metadata?.sub,
  ];
  return candidates.find(isSnowflake) ?? null;
}

function usernameOf(user) {
  const meta = user.user_metadata ?? {};
  return (
    meta.custom_claims?.global_name ??
    meta.full_name ??
    meta.name ??
    meta.user_name ??
    user.email ??
    "discord-user"
  );
}

function sql(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function timestamp(value) {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

const ownerOf = (discordId) => `(SELECT id FROM users WHERE discord_id = ${sql(discordId)})`;

const [authUsers, subscriptions, logs] = await Promise.all([
  listAuthUsers(),
  listTable("subscriptions", "created_at.asc"),
  listTable("notification_logs", "sent_at.asc"),
]);

const discordIdBySupabaseId = new Map();
const lines = [
  `-- Generated from ${url} at ${new Date().toISOString()}`,
  "-- Apply with: npx wrangler d1 execute DB --remote --file=supabase-export.sql",
  "",
];

for (const user of authUsers) {
  const discordId = discordIdOf(user);
  if (!discordId) {
    console.warn(`Skipping user ${user.id} (${user.email ?? "no email"}): no Discord identity`);
    continue;
  }
  discordIdBySupabaseId.set(user.id, discordId);
  lines.push(
    `INSERT INTO users (id, discord_id, username, display_name, avatar, created_at) VALUES (` +
      [user.id, discordId, usernameOf(user), user.user_metadata?.full_name, null, timestamp(user.created_at)]
        .map(sql)
        .join(", ") +
      `) ON CONFLICT (discord_id) DO NOTHING;`,
  );
}

lines.push("");
const exportedSubscriptions = new Set();

for (const row of subscriptions) {
  const discordId = discordIdBySupabaseId.get(row.user_id);
  if (!discordId) {
    console.warn(`Skipping subscription ${row.id} (${row.name}): owner has no Discord identity`);
    continue;
  }
  exportedSubscriptions.add(row.id);

  const values = {
    id: sql(row.id),
    user_id: ownerOf(discordId),
    name: sql(row.name),
    category: sql(row.category),
    price: sql(Number(row.price)),
    split_count: sql(Number(row.split_count ?? 1)),
    currency: sql(String(row.currency ?? "KRW").toUpperCase()),
    billing_cycle: sql(row.billing_cycle),
    next_billing_date: sql(row.next_billing_date),
    payment_method: sql(row.payment_method),
    status: sql(row.status),
    auto_renew: sql(Boolean(row.auto_renew)),
    memo: sql(row.memo),
    created_at: sql(timestamp(row.created_at)),
    updated_at: sql(timestamp(row.updated_at)),
  };
  const columns = Object.keys(values);
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  lines.push(
    `INSERT INTO subscriptions (${columns.join(", ")}) VALUES (${Object.values(values).join(", ")}) ` +
      `ON CONFLICT (id) DO UPDATE SET ${updates};`,
  );
}

lines.push("");
let exportedLogs = 0;

for (const log of logs) {
  if (!exportedSubscriptions.has(log.subscription_id)) {
    continue;
  }
  exportedLogs += 1;
  lines.push(
    `INSERT INTO notification_logs (id, subscription_id, notification_type, target_date, sent_at) VALUES (` +
      [log.id, log.subscription_id, log.notification_type, log.target_date, timestamp(log.sent_at)]
        .map(sql)
        .join(", ") +
      `) ON CONFLICT DO NOTHING;`,
  );
}

await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
console.log(
  `Wrote ${OUTPUT}: ${discordIdBySupabaseId.size} users, ${exportedSubscriptions.size} subscriptions, ${exportedLogs} notification logs.`,
);
