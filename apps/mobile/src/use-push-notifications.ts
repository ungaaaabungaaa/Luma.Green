import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import type { WebView } from "react-native-webview";

import type { Locale } from "../../../src/i18n/locales";
import { useTranslations } from "./i18n";
import { classifyNavigation } from "./navigation";
import {
  notificationDestination,
  parsePushRequest,
  type PushResult,
  pushResultScript,
  pushSignalScript,
  runtimePushProject,
} from "./push-policy";
import { registerPush } from "./push-registration";

const projectId = runtimePushProject(Constants.expoConfig?.extra);

async function currentToken(): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Push registration timed out"));
        }, 10_000);
      }),
    ]);
    if (
      !/^(?:ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(result.data) ||
      result.data.length > 256
    )
      throw new Error("Invalid push registration");
    return result.data;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Native capabilities stay inside the trusted hosted app; identity stays on the server. */
export function usePushNotifications({
  origin,
  locale,
  currentUrl,
  webView,
  onOpenInbox,
}: {
  origin: string;
  locale: Locale;
  currentUrl: RefObject<string>;
  webView: RefObject<WebView | null>;
  onOpenInbox: (url: string) => void;
}) {
  const t = useTranslations("notifications");
  const native = useTranslations("native");
  const busy = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current += 1;
    };
  }, []);

  const signal = useCallback(
    (kind: "ready" | "changed") => {
      if (
        !alive.current ||
        classifyNavigation(currentUrl.current, origin) !== "internal"
      )
        return;
      webView.current?.injectJavaScript(
        pushSignalScript(currentUrl.current, kind),
      );
    },
    [origin, currentUrl, webView],
  );

  useEffect(() => {
    if (!projectId) return;
    // The in-app inbox owns foreground updates; avoid a second OS banner.
    Notifications.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
    });
    const openInbox = () => {
      if (!alive.current) return;
      onOpenInbox(notificationDestination(origin, localeRef.current));
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        console.warn("Could not clear the handled notification response.");
      }
    };
    const response =
      Notifications.addNotificationResponseReceivedListener(openInbox);
    const token = Notifications.addPushTokenListener(() => {
      signal("changed");
    });
    try {
      if (Notifications.getLastNotificationResponse()) openInbox();
    } catch {
      console.warn("Could not read the initial notification response.");
    }
    return () => {
      response.remove();
      token.remove();
    };
  }, [origin, onOpenInbox, signal]);

  const receive = async (raw: string, frameUrl: string) => {
    const documentUrl = currentUrl.current;
    const request = parsePushRequest(raw, frameUrl, documentUrl, origin);
    if (!request) return;
    const requestGeneration = generation.current;
    const isCurrent = () =>
      alive.current &&
      requestGeneration === generation.current &&
      currentUrl.current === documentUrl;
    const reply = (value: Omit<PushResult, "requestId">) => {
      if (isCurrent())
        webView.current?.injectJavaScript(
          pushResultScript(documentUrl, {
            ...value,
            requestId: request.requestId,
          }),
        );
    };
    if (!projectId) {
      reply({ status: "unavailable" });
      return;
    }
    if (busy.current) {
      reply({ status: "error" });
      return;
    }
    busy.current = true;
    try {
      const result = await registerPush({
        enable: request.type === "luma.push.enable",
        isCurrent,
        getPermission: Notifications.getPermissionsAsync,
        explain: () =>
          new Promise<boolean>((resolve) => {
            Alert.alert(
              t("title"),
              t("permissionBody"),
              [
                {
                  text: native("deny"),
                  style: "cancel",
                  onPress: () => {
                    resolve(false);
                  },
                },
                {
                  text: native("allow"),
                  onPress: () => {
                    resolve(true);
                  },
                },
              ],
              {
                cancelable: true,
                onDismiss: () => {
                  resolve(false);
                },
              },
            );
          }),
        prepareChannel: async () => {
          if (Platform.OS === "android")
            await Notifications.setNotificationChannelAsync("account-updates", {
              name: t("title"),
              importance: Notifications.AndroidImportance.DEFAULT,
            });
        },
        askPermission: Notifications.requestPermissionsAsync,
        getToken: currentToken,
      });
      if (result) reply(result);
    } catch {
      reply({ status: "error" });
    } finally {
      busy.current = false;
    }
  };

  return {
    receive,
    ready: () => {
      signal("ready");
    },
    invalidate: () => {
      generation.current += 1;
    },
  };
}
