"use client";

import { useEffect, useState } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { ConversationWindow } from './ConversationWindow';
import { MessageSquare, Minus, X } from 'lucide-react';
import type { ConversationId } from '../domain/types';

export function ChatFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<Set<ConversationId>>(new Set());
  const { conversations, loadConversations } = useConversationStore();

  const toggleWindow = (convId: ConversationId) => {
    setOpenWindows(prev => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  };
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  return (
    <>
      <div className="fixed bottom-20 right-20 z-50">
        {isOpen ? (
          <div className="bg-white rounded-t-lg shadow-2xl w-80 h-96 flex flex-col border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
              <h3 className="font-semibold ">Messages</h3>
              <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="w-12 h-12 mb-2" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => toggleWindow(conv.id)}
                      className="w-full px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">
                              {conv.participants[0]?.name || 'Unknown'}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {conv.lastMessage?.content || 'No messages'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-900 text-white rounded-full p-4 shadow-lg transition-colors"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>

      {Array.from(openWindows).map((convId) => {
        const conv = conversations.find((c) => c.id === convId);
        if (!conv) return null;

        return (
          <ConversationWindow
            key={convId}
            conversation={conv}
            onClose={() => toggleWindow(convId)}
          />
        );
      })}
    </>
  );
}
