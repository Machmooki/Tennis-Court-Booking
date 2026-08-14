"use client";

import { useRef, useState } from "react";
import { BookingDateNav } from "@/components/booking/booking-date-nav";
import { HorizontalDateStrip } from "@/components/booking/horizontal-date-strip";
import { findBookableDateByMonth } from "@/lib/booking/find-bookable-date";

export function BookingDateControls({
  date,
  courtIds,
  onDateSelect,
}: {
  date: string;
  courtIds: string[];
  onDateSelect: (date: string) => void;
}) {
  const [isFindingMonth, setIsFindingMonth] = useState(false);
  const [monthNavigationMessage, setMonthNavigationMessage] = useState("");
  const isFindingMonthRef = useRef(false);

  function selectDate(nextDate: string) {
    if (nextDate !== date) onDateSelect(nextDate);
  }

  async function selectMonth(direction: -1 | 1) {
    if (isFindingMonthRef.current) return;

    isFindingMonthRef.current = true;
    setIsFindingMonth(true);
    setMonthNavigationMessage("");

    try {
      const nextDate = await findBookableDateByMonth({
        date,
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
        date={date}
        isPending={isFindingMonth}
        onDateSelect={selectDate}
        onMonthSelect={selectMonth}
      />
      <HorizontalDateStrip
        date={date}
        isPending={false}
        onDateSelect={selectDate}
      />
      <span className="sr-only" aria-live="polite">
        {monthNavigationMessage}
      </span>
    </>
  );
}
