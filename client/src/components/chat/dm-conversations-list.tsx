
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { useAuth } from "@/hooks/use-auth";

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
}

export function DMConversationsList({ onSelectUser }: DMConversationsListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

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
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
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

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Direct Messages</h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading conversations...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Direct Messages</h3>

        {conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectUser({
                  id: conversation.id,
                  username: conversation.username,
                  level: conversation.level,
                  status: conversation.status,
                  isOnline: conversation.isOnline,
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <UserAvatar 
                          username={conversation.username} 
                          size="md"
                          isOnline={conversation.isOnline}
                        />
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{conversation.username}</div>
                        <div className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage || 'No messages yet'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTime(conversation.lastMessageTime)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-gray-500 mb-2">No conversations yet</div>
              <div className="text-sm text-gray-400">Send a message to start chatting!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
