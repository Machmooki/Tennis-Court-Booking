"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookingDateNav } from "@/components/booking/booking-date-nav";
import { HorizontalDateStrip } from "@/components/booking/horizontal-date-strip";
import { findBookableDateByMonth } from "@/lib/booking/find-bookable-date";

export function BookingDateControls({
  date,
  courtIds,
}: {
  date: string;
  courtIds: string[];
}) {
  const router = useRouter();
  const [optimisticDate, setOptimisticDate] = useOptimistic(date);
  const [isPending, startTransition] = useTransition();
  const [isFindingMonth, setIsFindingMonth] = useState(false);
  const [monthNavigationMessage, setMonthNavigationMessage] = useState("");
  const isFindingMonthRef = useRef(false);

  function selectDate(nextDate: string) {
    if (nextDate === optimisticDate) return;

    startTransition(() => {
      setOptimisticDate(nextDate);
      router.push(`/booking?date=${nextDate}`, { scroll: false });
    });
  }

  async function selectMonth(direction: -1 | 1) {
    if (isFindingMonthRef.current) return;

    isFindingMonthRef.current = true;
    setIsFindingMonth(true);
    setMonthNavigationMessage("");

    try {
      const nextDate = await findBookableDateByMonth({
        date: optimisticDate,
        direction,
        courtIds,
      });

      if (nextDate) {
        selectDate(nextDate);
      } else {
        setMonthNavigationMessage(
          direction === -1
            ? "No earlier bookable month is available."
            : "No bookable month was found."
        );
      }
    } catch (error) {
      console.error("[booking] failed to navigate by month:", error);
      setMonthNavigationMessage("Unable to check month availability.");
    } finally {
      isFindingMonthRef.current = false;
      setIsFindingMonth(false);
    }
  }

  return (
    <>
      <BookingDateNav
        date={optimisticDate}
        isPending={isPending || isFindingMonth}
        onDateSelect={selectDate}
        onMonthSelect={selectMonth}
      />
      <HorizontalDateStrip
        date={optimisticDate}
        isPending={isPending}
        onDateSelect={selectDate}
      />
      <span className="sr-only" aria-live="polite">
        {monthNavigationMessage}
      </span>
    </>
  );
}
