import { isLocale, type Locale } from "@/i18n/locales";

import ar from "../../messages/ar.json";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import gu from "../../messages/gu.json";
import hi from "../../messages/hi.json";
import kn from "../../messages/kn.json";
import ml from "../../messages/ml.json";
import mr from "../../messages/mr.json";
import pa from "../../messages/pa.json";
import ta from "../../messages/ta.json";
import te from "../../messages/te.json";
import ur from "../../messages/ur.json";

const catalogues = {
  en: { error: en.common.error, retry: en.common.retry },
  hi: { error: hi.common.error, retry: hi.common.retry },
  bn: { error: bn.common.error, retry: bn.common.retry },
  mr: { error: mr.common.error, retry: mr.common.retry },
  ta: { error: ta.common.error, retry: ta.common.retry },
  te: { error: te.common.error, retry: te.common.retry },
  kn: { error: kn.common.error, retry: kn.common.retry },
  ml: { error: ml.common.error, retry: ml.common.retry },
  gu: { error: gu.common.error, retry: gu.common.retry },
  pa: { error: pa.common.error, retry: pa.common.retry },
  ur: { error: ur.common.error, retry: ur.common.retry },
  ar: { error: ar.common.error, retry: ar.common.retry },
};

export function monitoringErrorCopy(pathname: string) {
  const segment = pathname.split("/", 2)[1] ?? "en";
  const locale: Locale = isLocale(segment) ? segment : "en";
  return { locale, ...catalogues[locale] };
}
