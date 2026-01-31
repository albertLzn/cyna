"use client";

import { useState, useEffect } from 'react';
import { useConversationStore } from '@/features/messaging/store/conversationStore';
import { ConversationList } from '@/features/messaging/components/ConversationList';
import { MessageList } from '@/features/messaging/components/MessageList';
import { MessageInput } from '@/features/messaging/components/MessageInput';
import { MessageSquare, Search, AlertCircle, RefreshCw } from 'lucide-react';
import type { ConversationId } from '@/features/messaging/domain/types';
import { Button } from '@/features/messaging/components/ui/button';
import { Input } from '@/features/messaging/components/ui/input';
import { Card, CardContent } from '@/features/messaging/components/ui/card';
import { Badge } from '@/features/messaging/components/ui/badge';

export default function MessagesPage() {
  const { conversations, loading, error, loadConversations, clearError } = useConversationStore();
  const [selectedId, setSelectedId] = useState<ConversationId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const participant = conv.participants[0]?.name.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
    return participant.includes(searchQuery.toLowerCase()) || lastMsg.includes(searchQuery.toLowerCase());
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (loading && conversations.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="border-b px-6 py-4 bg-white z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside
          className={`
            w-full md:w-80 border-r flex flex-col bg-white
            ${isMobileSidebarOpen ? 'block' : 'hidden md:block'}
          `}
        >
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <Card className="mx-4 mt-4 border-red-200 bg-red-50">
              <CardContent className="pt-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">Error loading conversations</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      clearError();
                      loadConversations();
                    }}
                    className="text-red-700 h-auto p-0 mt-2"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-600">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen(false);
                }
              }}
            />
          )}
        </aside>

        <main
          className={`
            flex-1 flex flex-col bg-gray-50
            ${!isMobileSidebarOpen ? 'block' : 'hidden md:flex'}
          `}
        >
          {selectedConversation ? (
            <>
              <header className="border-b px-6 py-4 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden -ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.participants[0]?.name || 'Unknown'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.participants[0]?.presenceStatus === 'online' 
                        ? 'Online' 
                        : 'Offline'}
                    </p>
                  </div>
                </div>

                {selectedConversation.unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {selectedConversation.unreadCount} unread
                  </Badge>
                )}
              </header>
              <div className="flex-1 overflow-hidden">
                <MessageList conversationId={selectedId} />
              </div>
              <MessageInput conversationId={selectedId} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <MessageSquare className="w-20 h-20 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">Select a conversation</p>
              <p className="text-sm text-gray-500 mt-2">
                Choose from the list on the left to view messages
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}