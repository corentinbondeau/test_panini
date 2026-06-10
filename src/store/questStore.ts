import { create } from 'zustand';

interface QuestStore {
  refreshTrigger: number;
  triggerRefresh: () => void;
  clearRefreshTrigger: () => void;
}

export const useQuestStore = create<QuestStore>((set) => ({
  refreshTrigger: 0,
  triggerRefresh: () => set({ refreshTrigger: Date.now() }),
  clearRefreshTrigger: () => set({ refreshTrigger: 0 }),
}));
