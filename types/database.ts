// Hand-written to match `supabase/migrations/20260810154328_initial_schema.sql`.
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

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type TransactionType =
  | "payment"
  | "refund"
  | "credit_topup"
  | "credit_deduction";
export type TransactionStatus = "pending" | "completed" | "failed";

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
  created_at: string;
  updated_at: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          full_name: string;
          auth_user_id?: string | null;
          credit_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          full_name?: string;
          auth_user_id?: string | null;
          credit_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      // anon/authenticated only. Read-only "is this still payable?" check -
      // see supabase/migrations/20260812000000_stripe_payment_rpcs.sql.
      create_payment_intent: {
        Args: {
          p_booking_id: string;
        };
        Returns: {
          total_price: number;
          court_name: string;
          start_time: string;
          end_time: string;
        }[];
      };
      // service_role only - never callable from anon/authenticated clients.
      confirm_booking_payment: {
        Args: {
          p_booking_id: string;
          p_payment_intent_id: string;
          p_provider_reference: string;
        };
        Returns: {
          booking_id: string;
          customer_id: string;
          amount: number;
        }[];
      };
      // anon/authenticated only. Powers the dedicated /booking/payment/[id]
      // page - see supabase/migrations/20260812020000_get_booking_for_payment.sql.
      get_booking_for_payment: {
        Args: {
          p_booking_id: string;
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
    };
  };
}
