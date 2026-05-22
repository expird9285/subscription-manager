export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BillingCycle =
  | "monthly"
  | "yearly"
  | "quarterly"
  | "weekly"
  | "custom";

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "cancel_pending"
  | "cancelled"
  | "trial";

export type NotificationType = "d7" | "d3" | "d1" | "dday";

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

export type Database = {
  public: {
    Tables: {
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Subscription, "id" | "created_at" | "updated_at" | "user_id">
        >;
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_logs: {
        Row: {
          id: string;
          subscription_id: string;
          notification_type: NotificationType;
          target_date: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          notification_type: NotificationType;
          target_date: string;
          sent_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "notification_logs_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_billing_cycle: BillingCycle;
      subscription_status: SubscriptionStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
