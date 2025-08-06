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
          return (
            <div key={message.id} className="flex justify-center">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {message.content}
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
                <span className="font-semibold text-sm text-gray-800">
                  {isOwnMessage ? "You" : message.sender.username}
                </span>
                <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-semibold">
                  Level {message.sender.level}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <div className="text-sm text-gray-800 break-words">
                {message.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
