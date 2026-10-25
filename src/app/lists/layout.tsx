import type { Metadata } from "next";

export const metadata: Metadata = { title: "My lists" };

export default function ListsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
