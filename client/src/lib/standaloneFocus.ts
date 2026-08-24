import type { FocusSessionView } from "@/components/FocusSession";

export type StandaloneFocusState = {
  session: FocusSessionView | null;
  strictEndsAt: number | null;
  continuePlan: boolean;
};

export const standaloneFocusStorageKey = "fakkik-pages-focus-v1";
export const emptyStandaloneFocusState: StandaloneFocusState = { session: null, strictEndsAt: null, continuePlan: false };

export function readStandaloneFocusState(raw: string | null): StandaloneFocusState {
  if (!raw) return emptyStandaloneFocusState;
  try {
    const value = JSON.parse(raw) as Partial<StandaloneFocusState>;
    return {
      session: value.session && typeof value.session.endsAt === "number" ? value.session : null,
      strictEndsAt: typeof value.strictEndsAt === "number" ? value.strictEndsAt : null,
      continuePlan: value.continuePlan === true,
    };
  } catch {
    return emptyStandaloneFocusState;
  }
}

export function createStandaloneFocusSession(input: { conversationId?: string | null; stepOrder: number; stepTitle: string; durationSeconds: number; now?: number }): FocusSessionView {
  const now = input.now ?? Date.now();
  return {
    id: crypto.randomUUID(),
    conversationId: input.conversationId ?? undefined,
    stepOrder: input.stepOrder,
    stepTitle: input.stepTitle,
    durationSeconds: Math.max(1, Math.round(input.durationSeconds)),
    endsAt: now + Math.max(1, Math.round(input.durationSeconds)) * 1_000,
    status: "running",
  };
}

export function advanceStandaloneFocusState(state: StandaloneFocusState, now = Date.now()): StandaloneFocusState {
  const session = state.session;
  const strictEndsAt = state.strictEndsAt && state.strictEndsAt > now ? state.strictEndsAt : null;
  if (!session || session.status !== "running" || session.endsAt > now) return { ...state, strictEndsAt };
  return { ...state, strictEndsAt, session: { ...session, status: "awaiting_reflection" } };
}

export function isStandaloneStrictActive(state: StandaloneFocusState, now = Date.now()) {
  return Boolean(state.strictEndsAt && state.strictEndsAt > now);
}
