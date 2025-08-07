import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Search, MessageCircle, Plus, Users } from "lucide-react";
import Lottie from "react-lottie-player";
import { cn } from '@/lib/utils'; // Import cn utility

interface Conversation {
  id: string;
  username: string;
  level: number;
  isOnline: boolean;
  status: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface DMConversationsListProps {
  onSelectUser: (user: {
    id: string;
    username: string;
    level: number;
    status: string;
    isOnline: boolean;
  }) => void;
  isDarkMode?: boolean; // Add isDarkMode prop
}

export function DMConversationsList({ onSelectUser, isDarkMode }: DMConversationsListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv =>
        conv.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages/conversations', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to load conversations. Status:', response.status);
        console.error('Response:', errorText);
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-green-500';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("h-full flex flex-col", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
        <div className={cn("border-b p-4 flex items-center justify-between", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
          <h2 className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>Direct Messages</h2>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4", isDarkMode ? "text-gray-500" : "text-gray-400")} />
            <Input
              placeholder="Search conversations..."
              value=""
              readOnly
              className={cn("pl-10", isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-gray-100 border-gray-200")}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                    <div className={cn("w-12 h-12 rounded-full animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                    <div className="flex-1">
                      <div className={cn("h-4 rounded w-1/3 mb-2 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                      <div className={cn("h-3 rounded w-2/3 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className={cn("flex items-center justify-center h-full", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              <div className="text-center">
                <MessageCircle className={cn("w-12 h-12 mx-auto mb-4", isDarkMode ? "text-gray-600" : "text-gray-300")} />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new conversation by searching for users</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectUser({
                    id: conversation.id,
                    username: conversation.username,
                    level: conversation.level,
                    status: conversation.status,
                    isOnline: conversation.isOnline,
                  })}
                  className={cn("w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100")}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <UserAvatar
                      username={conversation.username}
                      size="md"
                      isOnline={conversation.isOnline}
                    />
                    {/* Status indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />

                    {/* Unread count badge */}
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Conversation details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={cn("font-medium truncate", isDarkMode ? "text-gray-200" : "text-gray-900")}>
                        {conversation.username}
                      </h3>
                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <Badge variant="default" className="bg-primary text-white text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={cn("text-sm truncate", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                      {conversation.lastMessageTime && (
                        <span className={cn("text-xs ml-2 flex-shrink-0", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
      <div className={cn("border-b p-4 flex items-center justify-between", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
        <h2 className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>Direct Messages</h2>
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-2", isDarkMode ? "text-primary-foreground" : "text-primary")}
          onClick={() => setShowNewChat(!showNewChat)}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4", isDarkMode ? "text-gray-500" : "text-gray-400")} />
          <Input
            placeholder="Search conversations..."
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value || "")}
            className={cn("pl-10", isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-gray-100 border-gray-200")}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <div className={cn("w-12 h-12 rounded-full animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                  <div className="flex-1">
                    <div className={cn("h-4 rounded w-1/3 mb-2 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                    <div className={cn("h-3 rounded w-2/3 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className={cn("flex items-center justify-center h-full", isDarkMode ? "text-gray-400" : "text-gray-500")}>
            <div className="text-center">
              <MessageCircle className={cn("w-12 h-12 mx-auto mb-4", isDarkMode ? "text-gray-600" : "text-gray-300")} />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new conversation by searching for users</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectUser({
                  id: conversation.id,
                  username: conversation.username,
                  level: conversation.level,
                  status: conversation.status,
                  isOnline: conversation.isOnline,
                })}
                className={cn("w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100")}
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <UserAvatar
                    username={conversation.username}
                    size="md"
                    isOnline={conversation.isOnline}
                  />
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />

                  {/* Unread count badge */}
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </div>
                  )}
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("font-medium truncate", isDarkMode ? "text-gray-200" : "text-gray-900")}>
                      {conversation.username}
                    </h3>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <Badge variant="default" className="bg-primary text-white text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={cn("text-sm truncate", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    {conversation.lastMessageTime && (
                      <span className={cn("text-xs ml-2 flex-shrink-0", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      {filteredConversations.length > 0 && (
        <div className={cn("mt-6 pt-4 border-t", isDarkMode ? "border-gray-700" : "border-gray-200")}>
          <div className={cn("flex items-center justify-center space-x-4 text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={cn("w-2 h-2 rounded-full", isDarkMode ? "bg-green-400" : "bg-green-500")} />
              <span>{filteredConversations.filter(c => c.isOnline).length} online</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}