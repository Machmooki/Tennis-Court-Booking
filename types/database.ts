// Hand-written to match the SQL migrations under `supabase/migrations/`,
// most recently `20260813100000_admin_analytics_cash_flow.sql`.
// Once the project is linked, replace with:
//   supabase gen types typescript --linked > types/database.ts
//
// Row/Insert/Update are written as inline literal object types, matching the
// real `supabase gen types` output. Referencing a shared named interface (or
// wrapping fields in `Pick`/`Partial`) breaks supabase-js's generic
// inference for `.from(...)` once a Database has 4+ tables (observed with
// @supabase/supabase-js 2.112.2 + typescript 5.9.3) - it silently resolves
// the whole table to `never`. The exported `*Row` types below are for the
// app to import; they are NOT reused inside `Database` for that reason.

// 'blocked' (Phase 6.2) marks a slot an admin has taken offline (maintenance,
// private event, etc.) - it is not a real customer booking but still holds
// the slot via the same overlap-prevention exclusion constraint.
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "blocked";
export type TransactionType =
  | "payment"
  | "refund"
  | "credit_topup"
  | "credit_deduction";
export type TransactionStatus = "pending" | "completed" | "failed";
export type WalletTransactionType = "topup" | "usage" | "admin_adjustment";
export type PackageUsableAt = "all_times" | "off_peak";

// Return shape of the `get_admin_analytics()` RPC (Phase 6.3) - a single
// jsonb object, not a row set, so it's typed separately from the `*Row`
// table types above/below.
export interface CourtBookingAnalytics {
  court_id: string;
  court_name: string;
  /** Confirmed bookings for this court, current calendar month only. */
  bookings_count: number;
  /** Nominal booking value (not real cash - see `AdminAnalytics.total_revenue`). */
  revenue: number;
}

export interface AdminAnalytics {
  /**
   * Actual cash received this month: SUM of completed `payment`
   * `transactions` (Stripe/PromptPay), NOT `bookings.total_price` - a
   * wallet-paid booking has a nominal price but no new cash that month.
   */
  total_revenue: number;
  /** Confirmed bookings created this calendar month. */
  total_bookings: number;
  /** All-time count of customers with a linked auth account. */
  total_members: number;
  bookings_by_court: CourtBookingAnalytics[];
}

export interface CourtRow {
  id: string;
  name: string;
  peak_price: number;
  off_peak_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  phone: string;
  full_name: string;
  auth_user_id: string | null;
  credit_balance: number;
  wallet_hours_all_time: number;
  wallet_hours_off_peak: number;
  created_at: string;
  updated_at: string;
}

export interface PackageRow {
  id: string;
  name: string;
  price_thb: number;
  credit_hours: number;
  usable_at: PackageUsableAt;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRow {
  id: string;
  customer_id: string;
  package_id: string | null;
  type: WalletTransactionType;
  hours_amount: number;
  note: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  customer_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  payment_intent_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  customer_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  provider_reference: string | null;
  created_at: string;
}

// Matches `public.court_availability` (see the Phase 3 migration): a
// non-sensitive, read-only view of non-cancelled bookings for the public
// booking grid. Never add customer_id/total_price/payment_intent_id here.
export interface CourtAvailabilityRow {
  court_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export interface Database {
  public: {
    Tables: {
      courts: {
        Row: {
          id: string;
          name: string;
          peak_price: number;
          off_peak_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          peak_price: number;
          off_peak_price: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          peak_price?: number;
          off_peak_price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          full_name: string;
          auth_user_id: string | null;
          credit_balance: number;
          wallet_hours_all_time: number;
          wallet_hours_off_peak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          full_name: string;
          auth_user_id?: string | null;
          credit_balance?: number;
          wallet_hours_all_time?: number;
          wallet_hours_off_peak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          full_name?: string;
          auth_user_id?: string | null;
          credit_balance?: number;
          wallet_hours_all_time?: number;
          wallet_hours_off_peak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          name: string;
          price_thb: number;
          credit_hours: number;
          usable_at: PackageUsableAt;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_thb: number;
          credit_hours: number;
          usable_at?: PackageUsableAt;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_thb?: number;
          credit_hours?: number;
          usable_at?: PackageUsableAt;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          customer_id: string;
          package_id: string | null;
          type: WalletTransactionType;
          hours_amount: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          package_id?: string | null;
          type: WalletTransactionType;
          hours_amount: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          package_id?: string | null;
          type?: WalletTransactionType;
          hours_amount?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transactions_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          court_id: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status: BookingStatus;
          payment_intent_id: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          court_id: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status?: BookingStatus;
          payment_intent_id?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          court_id?: string;
          start_time?: string;
          end_time?: string;
          total_price?: number;
          status?: BookingStatus;
          payment_intent_id?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          customer_id: string;
          amount: number;
          type: TransactionType;
          status: TransactionStatus;
          provider_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          amount: number;
          type: TransactionType;
          status?: TransactionStatus;
          provider_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          amount?: number;
          type?: TransactionType;
          status?: TransactionStatus;
          provider_reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      court_availability: {
        Row: {
          court_id: string;
          start_time: string;
          end_time: string;
          status: BookingStatus;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      process_guest_booking: {
        Args: {
          p_phone: string;
          p_full_name: string;
          p_court_id: string;
          p_start_time: string;
          p_end_time: string;
          p_total_price: number;
        };
        Returns: string;
      };
      // anon/authenticated only. Read-only "is this whole batch still
      // payable?" check (all pending, all same customer) - see
      // supabase/migrations/20260813000000_batch_payment_rpcs.sql.
      create_payment_intent: {
        Args: {
          p_booking_ids: string[];
        };
        Returns: {
          total_price: number;
          description: string;
        }[];
      };
      // service_role only - never callable from anon/authenticated clients.
      confirm_booking_payment: {
        Args: {
          p_booking_ids: string[];
          p_payment_intent_id: string;
          p_provider_reference: string;
        };
        Returns: {
          booking_ids: string[];
          customer_id: string;
          total_amount: number;
        }[];
      };
      // anon/authenticated only. Powers the /booking/payment page (batch) -
      // see supabase/migrations/20260813000000_batch_payment_rpcs.sql.
      get_bookings_for_payment: {
        Args: {
          p_booking_ids: string[];
        };
        Returns: {
          booking_id: string;
          status: BookingStatus;
          total_price: number;
          start_time: string;
          end_time: string;
          created_at: string;
          court_name: string;
          customer_full_name: string;
          customer_phone: string;
        }[];
      };
      // anon/authenticated only. Guest manual cancel on the payment page -
      // see supabase/migrations/20260813020000_cancel_pending_bookings.sql.
      cancel_pending_bookings: {
        Args: {
          p_booking_ids: string[];
        };
        Returns: {
          cancelled_count: number;
        }[];
      };
      // authenticated only (requires auth.uid()) - pays for the caller's own
      // pending bookings from their hour wallet instead of Stripe. See
      // supabase/migrations/20260813060000_pay_with_wallet_rpc.sql.
      pay_with_wallet: {
        Args: {
          p_booking_ids: string[];
        };
        Returns: {
          booking_ids: string[];
          customer_id: string;
          hours_deducted_all_time: number;
          hours_deducted_off_peak: number;
        }[];
      };
      // authenticated + is_admin() inside - atomic counter top-up/clawback.
      // See supabase/migrations/20260813070000_admin_adjust_wallet.sql.
      admin_adjust_wallet: {
        Args: {
          p_customer_id: string;
          p_all_time_change: number;
          p_off_peak_change: number;
          p_reason: string;
        };
        Returns: {
          customer_id: string;
          wallet_hours_all_time: number;
          wallet_hours_off_peak: number;
        }[];
      };
      // authenticated + is_admin() inside - single-call dashboard aggregate.
      // Cash-flow (transactions-based) + current-month scoping - see
      // supabase/migrations/20260813100000_admin_analytics_cash_flow.sql.
      get_admin_analytics: {
        Args: Record<string, never>;
        Returns: AdminAnalytics;
      };
    };
  };
}
