/** Documentation adapter only. Never imported by the application build. */
function rejectAccountChange() {
  return Promise.reject(
    new Error("Documentation fixtures cannot change accounts."),
  );
}

export const authClient = {
  // A truthy marker renders signed-in controls; it is not a valid auth session.
  useSession: () => ({
    data: { fixture: true },
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
