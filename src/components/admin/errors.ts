/**
 * What the admin sees when Better Auth says no. English only — the admin
 * console isn't translated (docs/architecture/urls.md).
 */

interface AuthError {
  status?: number;
  code?: string;
}

const TOO_MANY = "Too many attempts. Wait a minute, then try again.";
const GENERIC = "Something went wrong. Try again.";

export function signInErrorMessage(error: AuthError): string {
  if (error.status === 429) return TOO_MANY;
  return error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401
    ? "That email and password don't match."
    : GENERIC;
}

export function signUpErrorMessage(error: AuthError): string {
  if (error.code === "ADMIN_SETUP_REQUIRED") {
    return "Check the setup token with the deployment owner, then try again.";
  }
  if (error.status === 429) return TOO_MANY;
  if (error.status === 403) {
    return "That isn't the admin email set for this deployment (ADMIN_EMAIL).";
  }
  if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
    return "The admin account already exists. Sign in instead.";
  }
  return error.code?.startsWith("PASSWORD_TOO")
    ? "Use a password between 12 and 128 characters."
    : GENERIC;
}

export function passwordErrorMessage(error: AuthError): string {
  if (error.status === 429) return TOO_MANY;
  return error.code === "INVALID_PASSWORD" || error.status === 400
    ? "That password is wrong."
    : GENERIC;
}

/** `restart` means the half-finished sign-in has expired: start again. */
export function codeErrorMessage(error: AuthError): {
  message: string;
  restart: boolean;
} {
  if (error.code === "INVALID_TWO_FACTOR_COOKIE") {
    return { message: "Your sign-in timed out. Start again.", restart: true };
  }
  if (error.status === 429 || error.code?.startsWith("TOO_MANY")) {
    return { message: TOO_MANY, restart: false };
  }
  if (error.code === "INVALID_CODE" || error.code === "INVALID_BACKUP_CODE") {
    return {
      message:
        "That code didn't work. Use the newest code, and check your phone's clock is set automatically.",
      restart: false,
    };
  }
  return { message: GENERIC, restart: false };
}
