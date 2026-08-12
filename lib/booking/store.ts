import { create } from "zustand";
import { slotKey } from "@/lib/booking/slots";

export interface SelectedSlot {
  courtId: string;
  courtName: string;
  startIso: string;
  endIso: string;
  price: number;
}

interface BookingStore {
  selectedSlots: SelectedSlot[];
  toggleSlot: (slot: SelectedSlot) => void;
  removeSlot: (courtId: string, startIso: string) => void;
  clear: () => void;
  isSelected: (courtId: string, startIso: string) => boolean;
  totalPrice: () => number;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  selectedSlots: [],

  toggleSlot: (slot) =>
    set((state) => {
      const key = slotKey(slot.courtId, slot.startIso);
      const exists = state.selectedSlots.some(
        (s) => slotKey(s.courtId, s.startIso) === key
      );

      return {
        selectedSlots: exists
          ? state.selectedSlots.filter(
              (s) => slotKey(s.courtId, s.startIso) !== key
            )
          : [...state.selectedSlots, slot],
      };
    }),

  removeSlot: (courtId, startIso) =>
    set((state) => ({
      selectedSlots: state.selectedSlots.filter(
        (s) => slotKey(s.courtId, s.startIso) !== slotKey(courtId, startIso)
      ),
    })),

  clear: () => set({ selectedSlots: [] }),

  isSelected: (courtId, startIso) => {
    const key = slotKey(courtId, startIso);
    return get().selectedSlots.some((s) => slotKey(s.courtId, s.startIso) === key);
  },

  totalPrice: () => get().selectedSlots.reduce((sum, s) => sum + s.price, 0),
}));
