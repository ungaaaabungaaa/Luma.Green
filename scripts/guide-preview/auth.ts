/** Documentation adapter only. Never imported by the application build. */
function rejectAccountChange() {
  return Promise.reject(
    new Error("Documentation fixtures cannot change accounts."),
  );
}

export const authClient = {
  signIn: {
    email: () =>
      window.location.pathname.endsWith("/failure.html") &&
      new URLSearchParams(window.location.search).get("scenario") === "totp"
        ? Promise.resolve({ data: { twoFactorRedirect: true }, error: null })
        : rejectAccountChange(),
  },
  signUp: { email: rejectAccountChange },
  // A truthy marker renders signed-in controls; it is not a valid auth session.
  useSession: () => ({
    data: { fixture: true, session: { id: undefined } },
    isPending: false,
    error: null,
  }),
  signOut: rejectAccountChange,
  requestPasswordReset: rejectAccountChange,
  resetPassword: rejectAccountChange,
  twoFactor: {
    enable: rejectAccountChange,
    disable: rejectAccountChange,
    verifyTotp: rejectAccountChange,
    verifyBackupCode: rejectAccountChange,
    generateBackupCodes: rejectAccountChange,
  },
};
