/** Documentation adapter only. Never imported by the application build. */
export const authClient = {
  signOut: () =>
    Promise.reject(new Error("Documentation fixtures cannot change accounts.")),
};
