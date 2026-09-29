import { type AbstractIntlMessages, createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import {
  ALL_FAQ_KEYS,
  ALL_GUIDE_KEYS,
  ALL_MODULE_KEYS,
  ALL_TUTORIAL_KEYS,
  contactHref,
  faqAnchor,
  faqsFor,
  findGuide,
  guide,
  guidesFor,
  HELP_ROLES,
  HELP_TOPICS,
  isHelpRole,
  ROLE_HELP,
  rolesWithFaq,
  rolesWithGuide,
  slugFor,
  supportTopicFor,
  trainingFor,
  tutorialsFor,
} from "./content";
import { SUPPORT_TOPICS } from "./support-api";

const help = messages.help as unknown as Record<string, unknown>;

/** The English string at a dotted path under `help`, or undefined. */
function copy(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      help,
    );
}

function expectCopy(path: string) {
  const value = copy(path);
  expect(typeof value, `help.${path}`).toBe("string");
  expect((value as string).trim(), `help.${path}`).not.toBe("");
}

function leafPaths(node: unknown, prefix = ""): string[] {
  return node === null || typeof node !== "object"
    ? [prefix]
    : Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        leafPaths(value, prefix ? `${prefix}.${key}` : key),
      );
}

const byName = (a: string, b: string) => a.localeCompare(b);

describe("help content", () => {
  it.each(HELP_ROLES)("gives %s enough to learn from", (role) => {
    const { guides, faqs, tutorials, training } = ROLE_HELP[role];
    expect(guides.length).toBeGreaterThanOrEqual(5);
    expect(guides.length).toBeLessThanOrEqual(8);
    expect(faqs.length).toBeGreaterThanOrEqual(8);
    expect(faqs.length).toBeLessThanOrEqual(12);
    expect(tutorials.length).toBeGreaterThanOrEqual(2);
    expect(tutorials.length).toBeLessThanOrEqual(3);
    expect(training.length).toBeGreaterThanOrEqual(3);
    expect(training.length).toBeLessThanOrEqual(5);
    // No item listed twice on one page.
    expect(new Set(guides).size).toBe(guides.length);
    expect(new Set(faqs).size).toBe(faqs.length);
  });

  it.each(ALL_GUIDE_KEYS)("keeps guide %s to 3–6 steps", (key) => {
    const { steps } = guide(key);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps.length).toBeLessThanOrEqual(6);
    expect(new Set(steps.map((step) => step.key)).size).toBe(steps.length);
  });

  it("has English copy for every role, topic, guide and step", () => {
    for (const role of HELP_ROLES) {
      for (const field of ["name", "who", "title", "lead"]) {
        expectCopy(`roles.${role}.${field}`);
      }
    }
    for (const topic of HELP_TOPICS) expectCopy(`topics.${topic}`);
    for (const key of ALL_GUIDE_KEYS) {
      expectCopy(`guides.${key}.title`);
      expectCopy(`guides.${key}.summary`);
      for (const step of guide(key).steps) {
        expectCopy(`guides.${key}.steps.${step.key}.title`);
        expectCopy(`guides.${key}.steps.${step.key}.body`);
      }
    }
  });

  it("has a question and an answer for every FAQ", () => {
    for (const key of ALL_FAQ_KEYS) {
      expectCopy(`faqs.${key}.q`);
      expectCopy(`faqs.${key}.a`);
    }
  });

  it("names every tutorial and fills every training lesson", () => {
    for (const key of ALL_TUTORIAL_KEYS) expectCopy(`tutorials.${key}`);
    for (const key of ALL_MODULE_KEYS) {
      for (const field of ["title", "p1", "p2", "p3"]) {
        expectCopy(`modules.${key}.${field}`);
      }
    }
  });

  it("has no copy that no page shows", () => {
    // A leftover key still costs eleven translations.
    const guideSteps = ALL_GUIDE_KEYS.flatMap((key) =>
      guide(key).steps.flatMap((step) => [
        `guides.${key}.steps.${step.key}.title`,
        `guides.${key}.steps.${step.key}.body`,
      ]),
    );
    const expected = new Set([
      ...ALL_GUIDE_KEYS.flatMap((key) => [
        `guides.${key}.title`,
        `guides.${key}.summary`,
      ]),
      ...guideSteps,
      ...ALL_FAQ_KEYS.flatMap((key) => [`faqs.${key}.q`, `faqs.${key}.a`]),
      ...ALL_TUTORIAL_KEYS.map((key) => `tutorials.${key}`),
      ...ALL_MODULE_KEYS.flatMap((key) =>
        ["title", "p1", "p2", "p3"].map((field) => `modules.${key}.${field}`),
      ),
    ]);
    const onDisk = ["guides", "faqs", "tutorials", "modules"].flatMap(
      (section) => leafPaths(help[section], section),
    );
    expect(onDisk.toSorted(byName)).toEqual([...expected].toSorted(byName));
  });

  it("uses every guide, question, video and lesson on some role's page", () => {
    const listed = (pick: (role: (typeof HELP_ROLES)[number]) => string[]) =>
      new Set(HELP_ROLES.flatMap((role) => pick(role)));
    expect(listed((role) => [...ROLE_HELP[role].guides])).toEqual(
      new Set(ALL_GUIDE_KEYS),
    );
    expect(listed((role) => [...ROLE_HELP[role].faqs])).toEqual(
      new Set(ALL_FAQ_KEYS),
    );
    expect(listed((role) => [...ROLE_HELP[role].tutorials])).toEqual(
      new Set(ALL_TUTORIAL_KEYS),
    );
    expect(listed((role) => [...ROLE_HELP[role].training])).toEqual(
      new Set(ALL_MODULE_KEYS),
    );
  });

  it("covers every topic somewhere", () => {
    const covered = new Set([
      ...ALL_GUIDE_KEYS.map((key) => guide(key).topic),
      ...HELP_ROLES.flatMap((role) => faqsFor(role).map((faq) => faq.topic)),
    ]);
    expect([...covered].toSorted(byName)).toEqual(
      [...HELP_TOPICS].toSorted(byName),
    );
  });

  it("parses every help message as ICU", () => {
    const errors: string[] = [];
    const catalog: AbstractIntlMessages = { help: messages.help };
    // Keys here are walked from the JSON at runtime, so they're plain strings.
    const t = createTranslator({
      locale: "en",
      messages: catalog,
      namespace: "help",
      onError: (error) => {
        errors.push(error.message);
      },
    }) as unknown as (
      key: string,
      values: Record<string, string | number>,
    ) => string;
    const values = {
      count: 2,
      query: "code",
      topic: "Prices",
      roles: "Yards",
      role: "Yards",
      guide: "Weigh and pay",
      number: 1,
      total: 4,
      done: 1,
      minutes: 3,
      max: 1000,
    };
    for (const path of leafPaths(help)) {
      expect(t(path, values), path).not.toBe(`help.${path}`);
    }
    expect(errors).toEqual([]);
  });
});

describe("guide lookups", () => {
  it("turns keys into short, lowercase, hyphenated slugs", () => {
    expect(slugFor("weighAndPay")).toBe("weigh-and-pay");
    expect(slugFor("signIn")).toBe("sign-in");
    for (const key of ALL_GUIDE_KEYS) {
      expect(slugFor(key)).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("finds a guide only under a role that has it", () => {
    expect(findGuide("kabadiwala", "weigh-and-pay")?.key).toBe("weighAndPay");
    expect(findGuide("household", "weigh-and-pay")).toBeUndefined();
    expect(findGuide("yard", "not-a-guide")).toBeUndefined();
  });

  it("shares one sign-in guide across every role that signs in", () => {
    expect(rolesWithGuide("signIn")).toEqual([
      "kabadiwala",
      "yard",
      "recycler",
      "manufacturer",
      "saathi",
    ]);
    expect(guidesFor("household").map((item) => item.key)).not.toContain(
      "signIn",
    );
  });

  it("lists every question's roles and gives each a unique anchor", () => {
    expect(rolesWithFaq("noCode")).toContain("household");
    const anchors = ALL_FAQ_KEYS.map((key) => faqAnchor(key));
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(faqAnchor("whoSeesAddress")).toBe("faq-who-sees-address");
  });

  it("reads tutorials and lessons in page order", () => {
    expect(tutorialsFor("kabadiwala").map((item) => item.key)).toEqual([
      "firstDay",
      "weighAndPayVideo",
      "settingPrices",
    ]);
    expect(trainingFor("saathi")[0]).toMatchObject({
      key: "firstJob",
      guide: "findJobs",
    });
  });

  it("knows the six roles and nothing else", () => {
    expect(isHelpRole("kabadiwala")).toBe(true);
    expect(isHelpRole("admin")).toBe(false);
    expect(isHelpRole("")).toBe(false);
  });
});

describe("contact pre-fill", () => {
  it("maps every topic to a topic the support inbox accepts", () => {
    for (const role of HELP_ROLES) {
      for (const topic of HELP_TOPICS) {
        expect(SUPPORT_TOPICS).toContain(supportTopicFor(topic, role));
      }
    }
  });

  it("files a household's dispute under pickups and a yard's under trades", () => {
    expect(supportTopicFor("disputes", "household")).toBe("pickup");
    expect(supportTopicFor("disputes", "kabadiwala")).toBe("pickup");
    expect(supportTopicFor("disputes", "yard")).toBe("trade");
  });

  it("builds the contact link with only what it knows", () => {
    expect(contactHref()).toEqual({ pathname: "/help/contact", query: {} });
    expect(contactHref("yard", "trade")).toEqual({
      pathname: "/help/contact",
      query: { role: "yard", topic: "trade" },
    });
  });
});
