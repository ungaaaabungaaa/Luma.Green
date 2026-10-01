/** @typedef {{autoDownload: boolean, autoInstallOnAppQuit: boolean, allowPrerelease: boolean, setFeedURL: (options: {provider: 'generic', url: string}) => void, checkForUpdates: () => Promise<{downloadPromise?: Promise<unknown> | null} | null | void>, quitAndInstall: () => void, on: (event: 'update-downloaded' | 'update-not-available' | 'error', listener: () => void) => unknown}} Updater */
/** Keep update errors away from the main application flow. No configured feed means no calls.
 * @param {Updater} updater @param {string | null} feed @param {boolean} packaged
 * @param {(state: 'ready' | 'current' | 'unavailable' | 'failed') => Promise<boolean>} notify */
export function setupUpdates(updater, feed, packaged, notify) {
  let isChecking = false;
  let isManual = false;
  let hasReportedError = false;
  const enabled = packaged && feed !== null;
  /** @param {'ready' | 'current' | 'unavailable' | 'failed'} state */
  const report = async (state) => {
    try {
      const shouldRestart = await notify(state);
      if (shouldRestart && state === "ready") updater.quitAndInstall();
    } catch (error) {
      console.error("Desktop update notification failed", error);
    }
  };
  if (enabled) {
    Object.assign(updater, {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      allowPrerelease: false,
    });
    updater.setFeedURL({ provider: "generic", url: feed });
    updater.on("update-downloaded", () => {
      void report("ready");
    });
    updater.on("update-not-available", () => {
      if (isManual) void report("current");
    });
    updater.on("error", () => {
      if (!isManual || hasReportedError) {
        return;
      }

      hasReportedError = true;
      void report("failed");
    });
  }
  return {
    /** @param {boolean} [isUserRequested] */
    async check(isUserRequested = false) {
      if (!enabled) {
        if (isUserRequested) await report("unavailable");
        return;
      }
      if (isChecking) return;
      isChecking = true;
      isManual = isUserRequested;
      hasReportedError = false;
      try {
        const result = await updater.checkForUpdates();
        await result?.downloadPromise;
      } catch (error) {
        if (isManual && !hasReportedError) await report("failed");
        // Keep the shell usable when the updater emits an error or rejects.
        console.error(
          "Desktop update check failed",
          error instanceof Error ? error.message : "unknown",
        );
      } finally {
        isChecking = false;
        isManual = false;
      }
    },
  };
}
