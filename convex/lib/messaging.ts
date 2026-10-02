import { ConvexError, v } from "convex/values";

export const MESSAGE_MAX_LENGTH = 2000;
export const SUBJECT_MAX_LENGTH = 120;
export const MESSAGES_PER_MINUTE = 12;
export const MESSAGE_PAGE_SIZE = 50;
export const CONVERSATION_PAGE_SIZE = 50;

export const vConversationKind = v.union(
  v.literal("support"),
  v.literal("trade"),
);
export const vConversationStatus = v.union(
  v.literal("open"),
  v.literal("closed"),
);

export const vConversationView = v.object({
  id: v.id("conversations"),
  kind: vConversationKind,
  status: vConversationStatus,
  subject: v.string(),
  updatedAt: v.number(),
  tradeId: v.optional(v.id("trades")),
  counterpartyName: v.optional(v.string()),
});

export const vMessageView = v.object({
  id: v.id("conversationMessages"),
  body: v.string(),
  createdAt: v.number(),
  isMine: v.boolean(),
  senderRole: v.union(v.literal("member"), v.literal("admin")),
  senderOrgName: v.optional(v.string()),
});

/** Store plain text. Renderers must display text nodes, never HTML or Markdown. */
export function messageText(input: string): string {
  const body = input.trim();
  if (body.length === 0 || body.length > MESSAGE_MAX_LENGTH) {
    throw new ConvexError("INVALID_MESSAGE");
  }
  return body;
}

export function supportSubject(input: string): string {
  const subject = input.trim();
  if (subject.length < 3 || subject.length > SUBJECT_MAX_LENGTH) {
    throw new ConvexError("INVALID_SUBJECT");
  }
  return subject;
}
