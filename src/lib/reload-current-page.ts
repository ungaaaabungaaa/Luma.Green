/** A manual reload also restarts an auth client that failed to obtain a token. */
export function reloadCurrentPage() {
  window.location.reload();
}
