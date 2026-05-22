"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { BillingCycle, SubscriptionStatus } from "@/lib/database.types";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const billingCycles = new Set<BillingCycle>([
  "monthly",
  "yearly",
  "quarterly",
  "weekly",
  "custom",
]);

const statuses = new Set<SubscriptionStatus>([
  "active",
  "paused",
  "cancel_pending",
  "cancelled",
  "trial",
]);

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function requireText(value: FormDataEntryValue | null, field: string) {
  const text = cleanText(value);

  if (!text) {
    throw new Error(`${field} is required`);
  }

  return text;
}

function parseSubscriptionForm(formData: FormData) {
  const name = requireText(formData.get("name"), "name");
  const price = Number(formData.get("price"));
  const splitCount = Number(formData.get("split_count") || 1);
  const billingCycle = String(formData.get("billing_cycle")) as BillingCycle;
  const status = String(formData.get("status") || "active") as SubscriptionStatus;
  const nextBillingDate = requireText(
    formData.get("next_billing_date"),
    "next_billing_date",
  );

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("price must be a positive number");
  }

  if (!Number.isInteger(splitCount) || splitCount < 1 || splitCount > 99) {
    throw new Error("split_count must be an integer between 1 and 99");
  }

  if (!billingCycles.has(billingCycle)) {
    throw new Error("invalid billing cycle");
  }

  if (!statuses.has(status)) {
    throw new Error("invalid status");
  }

  return {
    name,
    category: cleanText(formData.get("category")),
    price,
    split_count: splitCount,
    currency: (cleanText(formData.get("currency")) ?? "KRW").toUpperCase(),
    billing_cycle: billingCycle,
    next_billing_date: nextBillingDate,
    payment_method: cleanText(formData.get("payment_method")),
    status,
    auto_renew: formData.get("auto_renew") === "on",
    memo: cleanText(formData.get("memo")),
  };
}

function revalidateSubscriptionViews() {
  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  revalidatePath("/analytics");
  revalidatePath("/settings");
}

export async function createSubscription(formData: FormData) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const payload = parseSubscriptionForm(formData);

  const { error } = await supabase.from("subscriptions").insert({
    ...payload,
    user_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateSubscriptionViews();
  redirect("/subscriptions");
}

export async function updateSubscription(id: string, formData: FormData) {
  await getCurrentUser();
  const supabase = await createClient();
  const payload = parseSubscriptionForm(formData);

  const { error } = await supabase
    .from("subscriptions")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSubscriptionViews();
  redirect("/subscriptions");
}

export async function deleteSubscription(formData: FormData) {
  await getCurrentUser();
  const id = requireText(formData.get("id"), "id");
  const supabase = await createClient();

  const { error } = await supabase.from("subscriptions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSubscriptionViews();
}

export async function updateSubscriptionStatus(formData: FormData) {
  await getCurrentUser();
  const id = requireText(formData.get("id"), "id");
  const status = String(formData.get("status")) as SubscriptionStatus;

  if (!statuses.has(status)) {
    throw new Error("invalid status");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSubscriptionViews();
}

export async function toggleAutoRenew(formData: FormData) {
  await getCurrentUser();
  const id = requireText(formData.get("id"), "id");
  const autoRenew = formData.get("auto_renew") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ auto_renew: autoRenew })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSubscriptionViews();
}
