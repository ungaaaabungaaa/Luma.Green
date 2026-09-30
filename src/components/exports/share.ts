/**
 * Getting a file or a message out of the browser: a download, the phone's
 * share sheet, or a WhatsApp link when there is no share sheet. Kept apart
 * from the components so the parts that touch `navigator` and `window` are
 * small and tested.
 */

/** Hands the browser a file to save under `name`. */
export function saveFile(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the URL goes.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function saveText(name: string, text: string, type: string): void {
  saveFile(name, new Blob([text], { type }));
}

/** A WhatsApp link that opens a chat with the text ready to send. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Lines of a message as WhatsApp shows them: blank lines between groups. */
export function joinShareText(groups: readonly (readonly string[])[]): string {
  return groups
    .filter((group) => group.length > 0)
    .map((group) => group.join("\n"))
    .join("\n\n");
}

export type ShareOutcome = "shared" | "opened" | "cancelled";

function canUseShareSheet(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/**
 * Sends text through the phone's share sheet (WhatsApp is one tap away on
 * Android and iPhone), or opens WhatsApp itself where there is no share
 * sheet, as on most desktops. "cancelled" means the person closed the sheet.
 */
export async function shareText(
  title: string,
  text: string,
): Promise<ShareOutcome> {
  if (canUseShareSheet()) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled";
      }
      // The sheet refused the payload: fall back to WhatsApp on the web.
    }
  }
  window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
  return "opened";
}
