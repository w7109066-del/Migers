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

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === user?.id;
        const isSystemMessage = message.senderId === 'system';
        
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
              <div className="text-sm text-gray-800 break-words">
                <span className="font-semibold" style={{ color: '#2f7853' }}>
                  {message.sender.username}
                </span>
                <span className="text-gray-500 ml-1">
                  [{formatTime(message.createdAt)}]:
                </span>
                <span className="ml-1">
                  {message.content}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
