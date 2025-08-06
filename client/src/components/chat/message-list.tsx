import { useEffect, useRef, useState } from "react";
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
  const [hiddenGiftMessages, setHiddenGiftMessages] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-hide gift messages after 3 seconds
  useEffect(() => {
    const newGiftMessages = messages.filter(msg => 
      isGiftMessage(msg.content) && !hiddenGiftMessages.has(msg.id)
    );

    newGiftMessages.forEach(message => {
      const timer = setTimeout(() => {
        setHiddenGiftMessages(prev => new Set([...prev, message.id]));
      }, 3000);

      return () => clearTimeout(timer);
    });
  }, [messages, hiddenGiftMessages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isGiftMessage = (content: string) => {
    return content.includes('🎁 sent a') && content.includes('gift to');
  };

  const parseGiftMessage = (content: string, senderUsername: string) => {
    // Parse messages like "🎁 sent a Rose gift to everyone in the room ✨"
    const giftRegex = /🎁 sent a (.+) gift to (.+) ✨/;
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

        // Gift message rendering with auto-hide after 3 seconds
        if (isGift) {
          const giftData = parseGiftMessage(message.content, message.sender.username);
          const isHidden = hiddenGiftMessages.has(message.id);

          return (
            <div 
              key={message.id} 
              className={cn(
                "flex justify-center mb-4 transition-all duration-1000",
                isHidden ? "opacity-0 transform scale-95 pointer-events-none" : "opacity-100 animate-pulse"
              )}
              style={{ display: isHidden ? 'none' : 'flex' }}
            >
              <div className="bg-gradient-to-r from-yellow-100 via-orange-100 to-pink-100 border-2 border-orange-300 rounded-xl p-4 max-w-sm shadow-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="text-3xl animate-bounce">🎁</div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-purple-600 font-bold text-sm">{message.sender.username}</span>
                      <span className="text-gray-700 text-sm">sent</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      <span className="text-orange-600 font-bold text-lg">
                        {giftData?.giftName || 'Gift'}
                      </span>
                      <span className="text-gray-700 text-sm">to</span>
                    </div>
                    <div className="text-blue-600 font-semibold text-sm mt-1">
                      {giftData?.recipient}
                    </div>
                  </div>
                  <div className="text-3xl animate-spin" style={{animationDuration: '2s'}}>✨</div>
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