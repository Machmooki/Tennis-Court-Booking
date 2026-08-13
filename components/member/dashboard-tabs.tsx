"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Thin client wrapper around Shadcn `<Tabs>` - the actual table markup for
 * each panel is rendered server-side in `<DashboardData>` and passed in as
 * children, so switching tabs never re-fetches anything.
 */
export function DashboardTabs({
  bookingHistory,
  walletHistory,
}: {
  bookingHistory: ReactNode;
  walletHistory: ReactNode;
}) {
  return (
    <Tabs defaultValue="bookings">
      <TabsList>
        <TabsTrigger value="bookings">Booking History</TabsTrigger>
        <TabsTrigger value="wallet">Wallet History</TabsTrigger>
      </TabsList>
      <TabsContent value="bookings" className="mt-3">
        {bookingHistory}
      </TabsContent>
      <TabsContent value="wallet" className="mt-3">
        {walletHistory}
      </TabsContent>
    </Tabs>
  );
}
