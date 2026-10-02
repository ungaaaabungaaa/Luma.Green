/* global self */
// Notifications only. Private pages and API responses must never enter a cache.
self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (
    !payload ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string" ||
    payload.title.length > 120 ||
    payload.body.length > 300 ||
    payload.route !== "/account/notifications"
  )
    return;
  const locale =
    typeof payload.locale === "string" && /^[a-z]{2,3}$/.test(payload.locale)
      ? payload.locale
      : "en";
  const prefix = locale === "en" ? "" : `/${locale}`;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo.svg",
      tag: "luma-update",
      data: {
        path: `${prefix}/account/notifications`,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = event.notification.data?.path;
  const path =
    typeof candidate === "string" &&
    /^(\/[a-z]{2,3})?\/account\/notifications$/.test(candidate)
      ? candidate
      : "/account/notifications";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(focusInbox(url));
});

async function focusInbox(url) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const current = clients.find((client) => client.url === url);
  return current ? current.focus() : self.clients.openWindow(url);
}
