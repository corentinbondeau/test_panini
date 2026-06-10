import { create } from 'zustand';

interface BadgeStore {
  refreshTrigger: number;
  newBadges: string[];
  triggerRefresh: (badges?: string[]) => void;
  clearNewBadges: () => void;
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  refreshTrigger: 0,
  newBadges: [],
  triggerRefresh: (badges) =>
    set({ refreshTrigger: Date.now(), newBadges: badges ?? [] }),
  clearNewBadges: () => set({ newBadges: [] }),
}));
