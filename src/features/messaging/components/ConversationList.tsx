"use client";

import type { Conversation, ConversationId } from '../domain/types';

interface Props {
  conversations: Conversation[];
  selectedId: ConversationId | null;
  onSelect: (id: ConversationId) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`w-full px-4 py-3 border-b hover:bg-gray-50 text-left${selectedId === conv.id ? 'bg-blue-50' : ''
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium  truncate">
                  {conv.participants[0]?.name || 'Unknown'}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm ">
                {conv.lastMessage?.content || 'No messages'}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
