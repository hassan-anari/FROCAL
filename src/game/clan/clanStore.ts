import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clanJoinApplicants, getClanItemById, initialOwnedClanItemIds } from "./clanCatalog";
import type {
  ClanActiveEffect,
  ClanJoinApplicant,
  ClanMembershipStatus,
  ClanRole,
  CreatedClan,
  JoinRequestState,
} from "./types";

interface ClanState {
  role: ClanRole | null;
  membership: ClanMembershipStatus;
  joinRequestClanId: string | null;
  joinRequestState: JoinRequestState;
  activeClanId: string | null;
  createdClan: CreatedClan | null;
  treasury: number;
  ownedItemIds: string[];
  activeEffects: ClanActiveEffect[];
  applicants: ClanJoinApplicant[];
  chooseRole: (role: ClanRole) => void;
  createClan: (clan: CreatedClan) => void;
  requestJoin: (clanId: string) => void;
  rejectCurrentJoinForDiagnostics: () => void;
  acceptCurrentJoinForDiagnostics: () => void;
  purchaseItem: (itemId: string, price: number) => boolean;
  activateItem: (itemId: string) => boolean;
  acceptApplicant: (id: string) => void;
  rejectApplicant: (id: string) => void;
  setSoldierDiscoveryForDiagnostics: () => void;
  setSoldierPendingForDiagnostics: () => void;
  setSoldierMemberForDiagnostics: () => void;
  setCaptainHeadquartersForDiagnostics: () => void;
  resetClan: () => void;
}

const cloneJoinApplicants = (): ClanJoinApplicant[] =>
  clanJoinApplicants.map((applicant): ClanJoinApplicant => ({ ...applicant }));

const initialState = {
  role: null as ClanRole | null,
  membership: "none" as ClanMembershipStatus,
  joinRequestClanId: null as string | null,
  joinRequestState: "none" as JoinRequestState,
  activeClanId: null as string | null,
  createdClan: null as CreatedClan | null,
  treasury: 12_840,
  ownedItemIds: [...initialOwnedClanItemIds] as string[],
  activeEffects: [] as ClanActiveEffect[],
  applicants: cloneJoinApplicants(),
};

const diagnosticCaptainClan: CreatedClan = {
  name: "Aegis Prime",
  tag: "AGS",
  motto: "Move together. Hold the line.",
  accent: "cyan",
  telegramGroupId: "-1002284100138",
  telegramGroupTitle: "Aegis Community",
  telegramGroupUsername: "aegiscommunity",
};

export const useClanStore = create<ClanState>()(
  persist(
    (set, get) => ({
      ...initialState,

      chooseRole: (role) => {
        if (get().role !== null) return;
        set({
          role,
          membership: "none",
          joinRequestClanId: null,
          joinRequestState: "none",
          activeClanId: null,
          createdClan: null,
        });
      },

      createClan: (clan) => {
        if (get().role !== "captain") return;
        set({
          createdClan: clan,
          membership: "member",
          activeClanId: "captain-created",
          joinRequestClanId: null,
          joinRequestState: "none",
        });
      },

      requestJoin: (clanId) => {
        const state = get();
        if (state.role !== "soldier" || state.membership === "member") return;
        if (state.joinRequestState === "pending") return;
        set({
          membership: "pending",
          joinRequestClanId: clanId,
          joinRequestState: "pending",
        });
      },

      rejectCurrentJoinForDiagnostics: () => {
        if (!import.meta.env.DEV) return;
        if (get().joinRequestState !== "pending") return;
        set({
          membership: "none",
          joinRequestState: "rejected",
        });
      },

      acceptCurrentJoinForDiagnostics: () => {
        if (!import.meta.env.DEV) return;
        const state = get();
        if (state.role !== "soldier") return;
        const clanId = state.joinRequestClanId ?? "nova-vanguard";
        set({
          membership: "member",
          joinRequestState: "none",
          joinRequestClanId: null,
          activeClanId: clanId,
        });
      },

      purchaseItem: (itemId, price) => {
        const state = get();
        if (state.role !== "captain" || state.membership !== "member") return false;
        if (state.treasury < price) return false;
        set({
          treasury: state.treasury - price,
          ownedItemIds: [...state.ownedItemIds, itemId],
        });
        return true;
      },

      activateItem: (itemId) => {
        const state = get();
        if (state.role !== "captain" || state.membership !== "member") return false;
        const item = getClanItemById(itemId);
        if (!item || item.activationMode !== "timed" || !item.durationMinutes) return false;
        const ownedIndex = state.ownedItemIds.indexOf(itemId);
        if (ownedIndex < 0) return false;

        const now = Date.now();
        const activeEffects = state.activeEffects.filter((effect) => effect.endsAt > now);
        if (activeEffects.some((effect) => effect.itemId === itemId)) return false;

        const nextOwned = [...state.ownedItemIds];
        nextOwned.splice(ownedIndex, 1);
        set({
          ownedItemIds: nextOwned,
          activeEffects: [
            ...activeEffects,
            { id: `${itemId}-${now}`, itemId, startedAt: now, endsAt: now + item.durationMinutes * 60_000 },
          ],
        });
        return true;
      },

      acceptApplicant: (id) => set((state) => ({
        applicants: state.applicants.map((applicant) => applicant.id === id ? { ...applicant, status: "accepted" } : applicant),
      })),

      rejectApplicant: (id) => set((state) => ({
        applicants: state.applicants.map((applicant) => applicant.id === id ? { ...applicant, status: "rejected" } : applicant),
      })),

      setSoldierDiscoveryForDiagnostics: () => import.meta.env.DEV && set({
        ...initialState,
        role: "soldier",
      }),

      setSoldierPendingForDiagnostics: () => import.meta.env.DEV && set({
        ...initialState,
        role: "soldier",
        membership: "pending",
        joinRequestClanId: "nova-vanguard",
        joinRequestState: "pending",
      }),

      setSoldierMemberForDiagnostics: () => import.meta.env.DEV && set({
        ...initialState,
        role: "soldier",
        membership: "member",
        activeClanId: "nova-vanguard",
      }),

      setCaptainHeadquartersForDiagnostics: () => import.meta.env.DEV && set({
        ...initialState,
        role: "captain",
        membership: "member",
        activeClanId: "captain-created",
        createdClan: diagnosticCaptainClan,
      }),

      resetClan: () => set({
        ...initialState,
        ownedItemIds: [...initialOwnedClanItemIds],
        applicants: cloneJoinApplicants(),
      }),
    }),
    {
      name: "dalexio-clan-state-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        role: state.role,
        membership: state.membership,
        joinRequestClanId: state.joinRequestClanId,
        joinRequestState: state.joinRequestState,
        activeClanId: state.activeClanId,
        createdClan: state.createdClan,
        treasury: state.treasury,
        ownedItemIds: state.ownedItemIds,
        activeEffects: state.activeEffects,
        applicants: state.applicants,
      }),
    },
  ),
);
