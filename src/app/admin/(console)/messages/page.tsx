import type { Metadata } from "next";

import { MessageOutbox } from "@/components/admin/messages/message-outbox";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <MessageOutbox />;
}
