export const billingCycles = ["monthly", "yearly", "quarterly", "weekly", "custom"] as const;
export type BillingCycle = (typeof billingCycles)[number];

export const subscriptionStatuses = [
  "active",
  "paused",
  "cancel_pending",
  "cancelled",
  "trial",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type NotificationType = "d7" | "d3" | "d1" | "dday";

export type User = {
  id: string;
  discord_id: string;
  username: string;
  display_name: string | null;
  avatar: string | null;
  created_at: string;
  last_login_at: string | null;
};

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  price: number;
  split_count: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  payment_method: string | null;
  status: SubscriptionStatus;
  auto_renew: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionInput = Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">;

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User;
  };
};
