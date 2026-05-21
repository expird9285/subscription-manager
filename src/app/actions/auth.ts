"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAllowedEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function credentialsFromForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  if (!isAllowedEmail(email)) {
    redirect("/login?error=not_allowed");
  }

  return { email, password };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const next = String(formData.get("next") ?? "/dashboard");
  const credentials = credentialsFromForm(formData);

  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect("/login?error=invalid");
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const credentials = credentialsFromForm(formData);

  const { error } = await supabase.auth.signUp(credentials);

  if (error) {
    redirect("/login?error=signup");
  }

  redirect("/login?message=check_email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
