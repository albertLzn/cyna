"use client";

import { useState } from 'react';
import { X, Minus } from 'lucide-react';
import type { Conversation } from '../domain/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { CONVERSATION_WINDOW_POSITION } from '../domain/constants';

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export function ConversationWindow({ conversation, onClose }: Props) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position] = useState({
    bottom: CONVERSATION_WINDOW_POSITION.DEFAULT_BOTTOM_PX,
    right: CONVERSATION_WINDOW_POSITION.DEFAULT_RIGHT_PX,
  });

  return (
    <div
      className="fixed z-40 bg-white rounded-t-lg shadow-2xl border border-gray-200"
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        width: '360px',
        height: isMinimized ? '56px' : '500px',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">
            {conversation.participants[0]?.name || 'Unknown'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="h-[380px] overflow-y-auto">
            <MessageList conversationId={conversation.id} />
          </div>
          <div className="border-t p-3">
            <MessageInput conversationId={conversation.id} />
          </div>
        </>
      )}
    </div>
  );
}
