"use client";

import { ChatFloatingWrapper } from "@/app/messaging/components/ChatFloatingWrapper";
import { useConversationStore } from "@/app/messaging/store/conversationStore";
import { MessageSquare, Inbox, Clock, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { formatLastActivity } from "./messaging/domain/helpers/date-formatter";

export default function Home() {
  const { conversations, loadConversations, loading } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // metrics for mini-dashboard 
  const totalConversations = conversations.length;
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const lastActivity = conversations[0]?.lastMessage?.createdAt 
    ? formatLastActivity(conversations[0].lastMessage.createdAt)
    : "No activity";
  const lastPerson = conversations[0]?.participants[0]?.name || "No one";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Cyna</h1>
          <nav className="flex gap-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
              Home
            </Link>
            <Link href="/messages" className="text-gray-700 hover:text-blue-600 font-medium">
              Messages
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            CHAT NETWORKING
          </h2>
{/*  TODO :Add messages module / page
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Open Messages
            <ArrowRight className="w-5 h-5" />
          </Link> */}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Inbox className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? "..." : totalConversations}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Conversations</p>
            <p className="text-xs text-gray-500">Active chats</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? "..." : unreadCount}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-1">Unread Messages</p>
            <p className="text-xs text-gray-500">Needs attention</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {loading ? "..." : lastActivity}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-1">Last Activity</p>
            <p className="text-xs text-gray-500">{loading ? "..." : lastPerson}</p>
          </div>
        </div>
      </main>

      <ChatFloatingWrapper />
    </div>
  );
}