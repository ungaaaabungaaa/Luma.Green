import * as Updates from "expo-updates";
import { useCallback, useState } from "react";

import {
  canCheckUpdate,
  canRestartUpdate,
  type UpdateState,
} from "./update-policy";

export function useShellUpdates() {
  const nativeUpdates = Updates.useUpdates();
  const [checkState, setState] = useState<UpdateState>(
    !__DEV__ && Updates.isEnabled ? "idle" : "unavailable",
  );
  const state: UpdateState =
    checkState !== "failed" && nativeUpdates.isUpdatePending
      ? "ready"
      : checkState;

  const check = useCallback(async () => {
    if (!canCheckUpdate(Updates.isEnabled, __DEV__, state)) return;
    setState("checking");
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setState("current");
        return;
      }
      const downloaded = await Updates.fetchUpdateAsync();
      setState(downloaded.isNew ? "ready" : "current");
    } catch {
      setState("failed");
    }
  }, [state]);

  const restart = useCallback(async () => {
    if (!canRestartUpdate(state, true)) return;
    try {
      await Updates.reloadAsync();
    } catch {
      setState("failed");
    }
  }, [state]);

  return { state, check, restart };
}
