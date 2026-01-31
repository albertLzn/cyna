"use client";

import { useEffect, useRef } from "react";
import type { ConversationId, Message } from "../domain/types";
import { MessageStatus } from "../domain/types";
import { CheckCheck, Clock, XCircle } from "lucide-react";
import { useMessages } from "../hooks/useMessage";
import { MESSAGE_LIST_UI, MOCK_CURRENT_USER_ID, TIME_CONSTANTS } from "../domain/constants";
import { useTypingIndicator } from "../hooks/useTyping";
import { useConversationStore } from "../store/conversationStore";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  conversationId: ConversationId;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { messages, loading, loadMore, retryFailed } =
    useMessages(conversationId);
  const { typingUsers } = useTypingIndicator(conversationId);
  const { conversations } = useConversationStore();

  const currentConversation = conversations.find(c => c.id === conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop < MESSAGE_LIST_UI.LOAD_MORE_SCROLL_THRESHOLD_PX && !loading) {
      loadMore();
    }
  };

  const getStatusIcon = (msg: Message) => {
    if (msg.status === MessageStatus.FAILED) {
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    if (msg.status === MessageStatus.SENDING) {
      return <Clock className="h-3 w-3 text-gray-400 animate-pulse" />;
    }
    if (msg.status === MessageStatus.READ) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return <CheckCheck className="h-3 w-3 text-gray-400" />;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / TIME_CONSTANTS.MINUTE_MS);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / TIME_CONSTANTS.HOUR_MINUTES);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / TIME_CONSTANTS.DAY_HOURS);
    return `${days}d ago`;
  };

  // Mock current user ID (replace with real auth)
  const currentUserId = MOCK_CURRENT_USER_ID;

  return (
    <div
      className="flex-1 overflow-y-auto p-4"
      onScroll={handleScroll}
      ref={scrollRef}
    >
      {loading && messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Loading messages...
        </div>
      )}

      <div className="space-y-4">
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          const isDeleted = msg.deletedAt !== null;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"
                }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />

              <div
                className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"
                  }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 ${isOwn
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900"
                    } ${isDeleted ? "italic opacity-60" : ""}`}
                >
                  {isDeleted ? (
                    <p className="text-sm">[Message deleted]</p>
                  ) : (
                    <>
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}

                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.files.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs underline"
                            >
                              📎 {file.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatTime(msg.createdAt)}
                  </span>

                  {isOwn && getStatusIcon(msg)}

                  {msg.status === MessageStatus.FAILED && (
                    <button
                      onClick={() => retryFailed(msg.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && currentConversation && (
          <TypingIndicator
            conversationId={conversationId}
          />
        )}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
