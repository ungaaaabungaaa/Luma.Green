/** Documentation adapter only. Never imported by the application build. */
export const authClient = {
  signIn: {
    email: () =>
      new URLSearchParams(window.location.search).get("scenario") === "totp"
        ? Promise.resolve({ data: { twoFactorRedirect: true }, error: null })
        : Promise.reject(
            new Error("Documentation fixture: sign-in is offline."),
          ),
  },
  signUp: {
    email: () =>
      Promise.reject(new Error("Documentation fixture: setup is offline.")),
  },
  twoFactor: {
    enable: () =>
      Promise.reject(new Error("Documentation fixture: enrolment is offline.")),
    verifyTotp: () =>
      Promise.reject(
        new Error("Documentation fixture: verification is offline."),
      ),
    verifyBackupCode: () =>
      Promise.reject(
        new Error("Documentation fixture: verification is offline."),
      ),
  },
  signOut: () =>
    Promise.reject(new Error("Documentation fixtures cannot change accounts.")),
};
