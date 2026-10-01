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
  /** Free-text payment note; used when no registered card is linked. */
  payment_method: string | null;
  payment_card_id: string | null;
  /** Account that split-plan members pay their share into. */
  collection_account_id: string | null;
  /** Token of the public collection page (`/s/:token`); null when sharing is off. */
  share_token: string | null;
  status: SubscriptionStatus;
  auto_renew: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionInput = Omit<
  Subscription,
  "id" | "user_id" | "share_token" | "created_at" | "updated_at"
>;

export type BankAccount = {
  id: string;
  user_id: string;
  bank_name: string;
  nickname: string | null;
  account_number: string | null;
  holder_name: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type BankAccountInput = Pick<
  BankAccount,
  "bank_name" | "nickname" | "account_number" | "holder_name" | "memo"
>;

export type PaymentCard = {
  id: string;
  user_id: string;
  name: string;
  last4: string | null;
  bank_account_id: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentCardInput = Pick<PaymentCard, "name" | "last4" | "bank_account_id" | "memo">;

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User;
  };
};
