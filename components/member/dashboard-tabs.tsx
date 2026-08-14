"use client";

import { useState, type ReactNode } from "react";
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
  const [activeTab, setActiveTab] = useState<"bookings" | "wallet">(
    "bookings"
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === "bookings" || value === "wallet") {
          setActiveTab(value);
        }
      }}
    >
      <TabsList>
        <TabsTrigger value="bookings">Booking History</TabsTrigger>
        <TabsTrigger value="wallet">Wallet History</TabsTrigger>
      </TabsList>
      <TabsContent
        value="bookings"
        keepMounted
        className="mt-3 min-h-72"
      >
        {bookingHistory}
      </TabsContent>
      <TabsContent value="wallet" keepMounted className="mt-3 min-h-72">
        {walletHistory}
      </TabsContent>
    </Tabs>
  );
}
