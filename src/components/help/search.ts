import {
  ALL_FAQ_KEYS,
  ALL_GUIDE_KEYS,
  faq,
  faqAnchor,
  guide,
  type HelpRole,
  type HelpTopic,
  rolesWithFaq,
  rolesWithGuide,
} from "./content";

/** One guide or question, flattened into text that can be searched. */
export interface HelpEntry {
  id: string;
  kind: "guide" | "faq";
  topic: HelpTopic;
  /** Every role that lists it; the link goes to the first. */
  roles: HelpRole[];
  title: string;
  snippet: string;
  /** Everything else worth matching: a guide's steps. */
  body: string;
  href: string;
}

/** A translator scoped to the `help` namespace. */
export type HelpTranslate = (key: string) => string;

/** Every guide and question, each once, in their English message order. */
export function buildHelpIndex(t: HelpTranslate): HelpEntry[] {
  const guides = ALL_GUIDE_KEYS.flatMap((key): HelpEntry[] => {
    const roles = rolesWithGuide(key);
    const first = roles.at(0);
    if (first === undefined) return [];
    const { slug, topic, steps } = guide(key);
    return [
      {
        id: `guide:${key}`,
        kind: "guide",
        topic,
        roles,
        title: t(`guides.${key}.title`),
        snippet: t(`guides.${key}.summary`),
        body: steps
          .flatMap((step) => {
            const base = `guides.${key}.steps.${step.key}`;
            return [t(`${base}.title`), t(`${base}.body`)];
          })
          .join(" "),
        href: `/help/${first}/${slug}`,
      },
    ];
  });

  const faqs = ALL_FAQ_KEYS.flatMap((key): HelpEntry[] => {
    const roles = rolesWithFaq(key);
    const first = roles.at(0);
    if (first === undefined) return [];
    return [
      {
        id: `faq:${key}`,
        kind: "faq",
        topic: faq(key).topic,
        roles,
        title: t(`faqs.${key}.q`),
        snippet: t(`faqs.${key}.a`),
        body: "",
        href: `/help/${first}#${faqAnchor(key)}`,
      },
    ];
  });

  return [...guides, ...faqs];
}

/**
 * Lower-case, compatibility-normalised text with punctuation turned into
 * spaces. Letters, digits and combining marks survive in every script, so a
 * Kannada or Hindi query matches Kannada or Hindi copy.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

function words(text: string): string[] {
  const normal = normalizeForSearch(text);
  return normal ? normal.split(" ") : [];
}

/** How well one query word matches a field: 0 none, 1 inside, 2 word start. */
function hit(field: string, token: string): number {
  if (!field.includes(token)) return 0;
  return field.startsWith(token) || field.includes(` ${token}`) ? 2 : 1;
}

export interface HelpQuery {
  query: string;
  topic?: HelpTopic | null;
}

/**
 * Guides and questions matching every word of the query (in any order),
 * optionally within one topic. Title matches rank first, then summaries and
 * answers, then steps. With a topic and no words, the whole topic is listed.
 */
export function searchHelp(
  entries: readonly HelpEntry[],
  { query, topic }: HelpQuery,
): HelpEntry[] {
  const tokens = words(query);
  const inTopic = topic
    ? entries.filter((entry) => entry.topic === topic)
    : entries;
  if (tokens.length === 0) return topic ? [...inTopic] : [];

  const scored = inTopic.flatMap((entry, order) => {
    const title = normalizeForSearch(entry.title);
    const snippet = normalizeForSearch(entry.snippet);
    const body = normalizeForSearch(entry.body);
    let score = 0;
    for (const token of tokens) {
      const inTitle = hit(title, token);
      const inSnippet = hit(snippet, token);
      const inBody = hit(body, token);
      if (inTitle + inSnippet + inBody === 0) return [];
      score += inTitle * 3 + inSnippet * 2 + inBody;
    }
    return [{ entry, score, order }];
  });

  return scored
    .toSorted((a, b) => b.score - a.score || a.order - b.order)
    .map(({ entry }) => entry);
}
