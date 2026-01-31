"use client";

import dynamic from "next/dynamic";

const ChatFloating = dynamic(
  () => import("./ChatFloating").then((mod) => ({ default: mod.ChatFloating })),
  { ssr: false }
);

export function ChatFloatingWrapper() {
  return <ChatFloating />;
}
