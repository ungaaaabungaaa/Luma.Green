// Generic lock-screen copy. Keep in sync with messages/*.json; guarded by push.test.ts.
import { isLocale } from "../../src/i18n/locales";

const copy = {
  en: {
    title: "Luma.Green update",
    body: "Open Luma.Green to view your update.",
  },
  hi: {
    title: "Luma.Green की सूचना",
    body: "नई जानकारी देखने के लिए Luma.Green खोलें।",
  },
  bn: {
    title: "Luma.Green-এর আপডেট",
    body: "আপডেট দেখতে Luma.Green খুলুন।",
  },
  mr: {
    title: "Luma.Green कडून अद्यतन",
    body: "अद्यतन पाहण्यासाठी Luma.Green उघडा.",
  },
  ta: {
    title: "Luma.Green தகவல்",
    body: "புதிய தகவலைப் பார்க்க Luma.Green திறக்கவும்.",
  },
  te: {
    title: "Luma.Green సమాచారం",
    body: "కొత్త సమాచారం కోసం Luma.Green తెరవండి.",
  },
  kn: {
    title: "Luma.Green ಮಾಹಿತಿ",
    body: "ಹೊಸ ಮಾಹಿತಿ ನೋಡಲು Luma.Green ತೆರೆಯಿರಿ.",
  },
  ml: {
    title: "Luma.Green അറിയിപ്പ്",
    body: "പുതിയ വിവരം കാണാൻ Luma.Green തുറക്കുക.",
  },
  gu: {
    title: "Luma.Greenની માહિતી",
    body: "નવી માહિતી જોવા માટે Luma.Green ખોલો.",
  },
  pa: {
    title: "Luma.Green ਦੀ ਸੂਚਨਾ",
    body: "ਨਵੀਂ ਜਾਣਕਾਰੀ ਦੇਖਣ ਲਈ Luma.Green ਖੋਲ੍ਹੋ।",
  },
  ur: {
    title: "Luma.Green کی اطلاع",
    body: "تازہ معلومات دیکھنے کے لیے Luma.Green کھولیں۔",
  },
  ar: {
    title: "تحديث من Luma.Green",
    body: "افتح Luma.Green للاطلاع على التحديث.",
  },
  as: {
    title: "Luma.Greenৰ নতুন তথ্য",
    body: "নতুন তথ্য চাবলৈ Luma.Green খোলক।",
  },
  ne: {
    title: "Luma.Green को अद्यावधिक",
    body: "नयाँ जानकारी हेर्न Luma.Green खोल्नुहोस्।",
  },
  es: {
    title: "Novedad de Luma.Green",
    body: "Abre Luma.Green para ver la novedad.",
  },
  fr: {
    title: "Nouvelle de Luma.Green",
    body: "Ouvrez Luma.Green pour consulter la nouvelle.",
  },
  vi: {
    title: "Cập nhật từ Luma.Green",
    body: "Mở Luma.Green để xem cập nhật.",
  },
  si: {
    title: "Luma.Green වෙතින් තොරතුරක්",
    body: "අලුත් තොරතුරු බැලීමට Luma.Green විවෘත කරන්න.",
  },
  th: {
    title: "อัปเดตจาก Luma.Green",
    body: "เปิด Luma.Green เพื่อดูข้อมูลอัปเดต",
  },
  ru: {
    title: "Новость от Luma.Green",
    body: "Откройте Luma.Green, чтобы посмотреть обновление.",
  },
  de: {
    title: "Neues von Luma.Green",
    body: "Öffne Luma.Green, um die Neuigkeit anzusehen.",
  },
  or: {
    title: "Luma.Greenର ନୂଆ ସୂଚନା",
    body: "ନୂଆ ସୂଚନା ଦେଖିବାକୁ Luma.Green ଖୋଲନ୍ତୁ।",
  },
  ja: {
    title: "Luma.Greenからのお知らせ",
    body: "Luma.Greenを開いて最新情報をご確認ください。",
  },
  uk: {
    title: "Новина від Luma.Green",
    body: "Відкрийте Luma.Green, щоб переглянути оновлення.",
  },
  ko: {
    title: "Luma.Green 새 소식",
    body: "Luma.Green을 열어 새 소식을 확인하세요.",
  },
  it: {
    title: "Novità da Luma.Green",
    body: "Apri Luma.Green per vedere la novità.",
  },
  pl: {
    title: "Nowość od Luma.Green",
    body: "Otwórz Luma.Green, aby zobaczyć nową informację.",
  },
  tr: {
    title: "Luma.Green’den haber",
    body: "Yeni bilgiyi görmek için Luma.Green’i açın.",
  },
  zh: {
    title: "Luma.Green 最新消息",
    body: "打开 Luma.Green 查看最新消息。",
  },
  pt: {
    title: "Novidade da Luma.Green",
    body: "Abra a Luma.Green para ver a novidade.",
  },
  id: {
    title: "Kabar dari Luma.Green",
    body: "Buka Luma.Green untuk melihat kabar terbaru.",
  },
  nl: {
    title: "Nieuws van Luma.Green",
    body: "Open Luma.Green om het nieuws te bekijken.",
  },
  ms: {
    title: "Berita daripada Luma.Green",
    body: "Buka Luma.Green untuk melihat perkembangan terkini.",
  },
};

export function pushCopy(locale: string) {
  const checked = isLocale(locale) ? locale : "en";
  return { ...copy[checked], locale: checked };
}
