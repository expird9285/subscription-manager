import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { Subscription } from "@/lib/database.types";
import { isAllowedEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login");
  }

  return user;
});

export const getSubscriptions = cache(async () => {
  await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("next_billing_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Subscription[];
});

export async function getSubscription(id: string) {
  await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data as Subscription;
}
