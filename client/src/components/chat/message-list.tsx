import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
  };
}

interface MessageListProps {
  messages: Message[];
  onUserClick: (user: any) => void;
}

export function MessageList({ messages, onUserClick }: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isGiftMessage = (content: string) => {
    return content.includes('sent a') && content.includes('gift to');
  };

  const parseGiftMessage = (content: string, senderUsername: string) => {
    // Parse messages like "chatme sent a Golden Crown gift to tester"
    const giftRegex = /sent a (.+) gift to (.+)/;
    const match = content.match(giftRegex);

    if (match) {
      const giftName = match[1];
      const recipient = match[2];
      return { giftName, recipient };
    }
    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === user?.id;
        const isSystemMessage = message.senderId === 'system';
        const isGift = isGiftMessage(message.content);

        // Gift message rendering
        if (isGift) {
          const giftData = parseGiftMessage(message.content, message.sender.username);

          return (
            <div key={message.id} className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg p-3 max-w-md">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">🎁</span>
                  <div className="text-center">
                    <span className="text-blue-600 font-semibold">{message.sender.username}</span>
                    <span className="text-gray-700"> sent a </span>
                    <span className="text-orange-600 font-bold">
                      {giftData?.giftName || 'Gift'}
                    </span>
                    <span className="text-gray-700"> gift to </span>
                    <span className="text-blue-600 font-semibold">{giftData?.recipient}</span>
                  </div>
                  <span className="text-2xl">✨</span>
                </div>
              </div>
            </div>
          );
        }

        // System message rendering
        if (isSystemMessage) {
          const isWelcomeMessage = message.content.includes('Welcome to');
          const isCurrentlyInRoom = message.content.includes('Currently in the room:');
          const isRoomManaged = message.content.includes('This room is managed by');
          const isUserEnterLeave = message.content.includes('has entered') || message.content.includes('has left');

          return (
            <div key={message.id} className="mb-2">
              <div className="text-sm">
                {isWelcomeMessage && (
                  <div>
                    <span className="text-red-500 font-medium">System: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isCurrentlyInRoom && (
                  <div>
                    <span className="text-red-500 font-medium">System: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isRoomManaged && (
                  <div>
                    <span className="text-red-500 font-medium">System: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isUserEnterLeave && (
                  <div>
                    <span className="text-red-500 font-medium">System: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className="flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300"
          >
            <UserAvatar
              username={message.sender.username}
              size="sm"
              isOnline={message.sender.isOnline}
              onClick={() => onUserClick(message.sender)}
              className="cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span 
                  className="font-semibold" 
                  style={{ 
                    color: message.senderId === user?.id ? '#2f7853' : '#3f94d9' 
                  }}
                >
                  {message.sender.username}
                </span>
                <span className="text-gray-500 ml-1">
                  [{formatTime(message.createdAt)}]
                </span>
              </div>
              <div className="text-gray-700 text-sm break-words">
                {message.content.includes('🎁 sent') ? (
                  <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-orange-100 to-pink-100 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-700">
                      {message.content}
                    </span>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}