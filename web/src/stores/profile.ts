import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface Profile {
  id: string;
  name: string;
  color: string;
  pin: string;
}

export const PROFILES: Profile[] = [
  { id: "lawrence", name: "Lawrence", color: "#1d6fe0", pin: "1304" },
  { id: "lulu", name: "Lulu", color: "#ec4899", pin: "6767" },
];

interface ProfileStore {
  activeProfileId: string | null;
  unlock(profileId: string, pin: string): boolean;
  lock(): void;
  findProfile(id: string): Profile | undefined;
}

export const useProfileStore = create(
  persist(
    immer<ProfileStore>((set) => ({
      activeProfileId: null,
      unlock(profileId, pin) {
        const profile = PROFILES.find((p) => p.id === profileId);
        if (!profile) return false;
        if (profile.pin !== pin) return false;
        set((s) => {
          s.activeProfileId = profileId;
        });
        return true;
      },
      lock() {
        set((s) => {
          s.activeProfileId = null;
        });
      },
      findProfile(id) {
        return PROFILES.find((p) => p.id === id);
      },
    })),
    {
      name: "__MW::profile",
    },
  ),
);
