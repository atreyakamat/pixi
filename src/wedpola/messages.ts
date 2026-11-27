/**
 * Plain-language messages for sign-in and saving. Pure, so the mapping is unit tested.
 * Nothing here shows a raw server message to the photographer.
 */

export type Failure = { message?: string; code?: string; status?: number } | null | undefined;

/** Row-level security refused the change: the account's role doesn't allow it. */
export const REFUSED = "Your account isn't allowed to make this change.";

const NETWORK = /fetch|network|failed to/i;

/** A request that never got an answer: no code, no HTTP status, and a network-looking message. */
export function isNetworkFailure(e: Failure): boolean {
  return !!e && !e.code && !e.status && NETWORK.test(e.message ?? "");
}

export function signInMessage(e: Failure): string {
  if (!e) return "Sign-in didn't work. Try again.";
  if (isNetworkFailure(e)) return "Can't reach the sign-in service. Check your connection and try again.";
  if (e.status === 429) return "Too many tries. Wait a minute and try again.";
  const m = e.message ?? "";
  if (/invalid login credentials/i.test(m)) return "That email and password don't match. Check them and try again.";
  if (/email not confirmed/i.test(m)) return "This email hasn't been confirmed yet. Ask your studio owner to check the invite.";
  return "Sign-in didn't work. Try again.";
}

/** "Couldn't <what>." for a failed save, with the reason in plain words. */
export function saveMessage(e: Failure, what: string): string {
  if (e?.code === "42501") return REFUSED;
  if (isNetworkFailure(e)) return "Can't reach the studio. Check your connection and try again.";
  return `Couldn't ${what}. Try again.`;
}
