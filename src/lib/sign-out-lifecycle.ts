type SignOutState = {
  sessionId: string;
  status: "pending" | "complete";
} | null;

// Browser-memory intent only. It cannot authenticate a user or authorize a query.
const lifecycle = { state: null as SignOutState };
const listeners = new Set<() => void>();

function publish(next: SignOutState) {
  lifecycle.state = next;
  for (const listener of listeners) listener();
}

export function subscribeSignOutLifecycle(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const getSignOutLifecycle = () => lifecycle.state;
export const getServerSignOutLifecycle = () => null;

/** Start only after device revocation, immediately before the auth request. */
export function beginSignOutLifecycle(sessionId: string | undefined) {
  const pending: SignOutState = sessionId
    ? { sessionId, status: "pending" }
    : null;
  if (pending) publish(pending);
  return {
    complete() {
      if (pending && lifecycle.state === pending)
        publish({ sessionId: pending.sessionId, status: "complete" });
    },
    fail() {
      if (pending && lifecycle.state === pending) publish(null);
    },
  };
}
