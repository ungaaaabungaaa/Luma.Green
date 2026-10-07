import { readFileSync } from "node:fs";

const catalogues = Object.fromEntries(
  ["en", "ar", "ta"].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        new URL(`../../messages/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ),
  ]),
);

function localizedScreens(locale) {
  const scenes = [];
  const copy = catalogues[locale];
  for (const theme of ["light", "dark"]) {
    scenes.push(
      {
        name: `account-inbox-${locale}-${theme}`,
        route: `/${locale}/account/notifications`,
        component: "src/components/notifications/notifications-page.tsx",
        heading: copy.notifications.title,
        width: locale === "en" ? 768 : 390,
        height: 1000,
        theme,
        viewportOnly: true,
      },
      {
        name: `account-menu-${locale}-${theme}`,
        route: `/${locale}/account/notifications`,
        component: "src/components/account/account-menu.tsx",
        heading: copy.notifications.title,
        openMenuLabel: copy.nav.openMenu,
        width: locale === "en" ? 390 : 768,
        height: 1000,
        theme,
        viewportOnly: true,
      },
    );
  }
  scenes.push(
    {
      name: `operator-menu-${locale}`,
      route: `/${locale}/app?role=yard`,
      component: "src/components/app/app-shell.tsx",
      heading: copy.market.home.greeting.replace("{name}", "Demo yard"),
      openMenuLabel: copy.app.more,
      width: locale === "ta" ? 768 : 390,
      height: 1800,
      theme: locale === "ar" ? "dark" : "light",
      viewportOnly: true,
    },
    {
      name: `account-security-${locale}`,
      route: `/${locale}/account/security?security=${locale === "ar" ? "on" : "off"}`,
      component: "src/components/account/account-security.tsx",
      heading: copy.accountSecurity.title,
      width: locale === "en" ? 768 : 390,
      height: 1000,
      theme: locale === "ar" ? "dark" : "light",
      viewportOnly: true,
    },
    {
      name: `account-challenge-${locale}`,
      route: `/${locale}/login/factor`,
      component: "src/components/auth/factor-challenge.tsx",
      heading: copy.auth.twoFactorTitle,
      width: 390,
      height: 844,
      theme: locale === "ar" ? "dark" : "light",
      viewportOnly: true,
    },
  );
  return scenes;
}

export function accountScreens() {
  const scenes = ["en", "ar", "ta"].flatMap((locale) =>
    localizedScreens(locale),
  );
  scenes.push(
    {
      name: "account-inbox-empty",
      route: "/en/account/notifications?inbox=empty",
      component: "src/components/notifications/notifications-page.tsx",
      heading: catalogues.en.notifications.title,
      width: 390,
      height: 844,
      viewportOnly: true,
    },
    {
      name: "account-inbox-error",
      route: "/ta/account/notifications",
      component: "src/components/notifications/notifications-page.tsx",
      heading: catalogues.ta.notifications.title,
      rejectedActionLabel: catalogues.ta.notifications.markAllRead,
      width: 390,
      height: 1000,
      theme: "dark",
      viewportOnly: true,
    },
    {
      name: "account-security-enabled",
      route: "/en/account/security?security=on",
      component: "src/components/account/account-security.tsx",
      heading: catalogues.en.accountSecurity.title,
      width: 768,
      height: 1000,
      theme: "dark",
      viewportOnly: true,
    },
    {
      name: "account-recovery-challenge",
      route: "/en/login/factor",
      component: "src/components/auth/factor-challenge.tsx",
      heading: catalogues.en.auth.twoFactorTitle,
      switchModeLabel: catalogues.en.auth.twoFactorUseBackup,
      width: 390,
      height: 844,
      viewportOnly: true,
    },
  );

  for (const theme of ["light", "dark"]) {
    scenes.push(
      {
        name: `admin-password-recovery-${theme}`,
        route: "/admin/forgot-password",
        component: "src/components/admin/password-recovery.tsx",
        heading: "Reset your password",
        width: 390,
        height: 1000,
        theme,
        viewportOnly: true,
      },
      {
        name: `admin-password-reset-missing-${theme}`,
        route: "/admin/reset-password",
        component: "src/components/admin/password-recovery.tsx",
        heading: "Choose a new password",
        width: 768,
        height: 1000,
        theme,
        viewportOnly: true,
      },
    );
  }
  return scenes;
}
