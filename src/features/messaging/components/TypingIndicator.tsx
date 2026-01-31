"use client";

import type { ConversationId } from '../domain/types';
import { useTypingIndicator } from '../hooks/useTyping';

interface TypingIndicatorProps {
  conversationId: ConversationId;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { typingUsers, isTyping } = useTypingIndicator(conversationId);

  if (!isTyping) {
    return null;
  }

  const names = typingUsers.map((user) => user.name);

  const text =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}