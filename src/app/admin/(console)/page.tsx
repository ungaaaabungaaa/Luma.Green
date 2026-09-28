import type { Metadata } from "next";

import { ConsoleHome } from "@/components/admin/console-home";

export const metadata: Metadata = { title: "Home" };

export default function AdminHomePage() {
  return <ConsoleHome />;
}
