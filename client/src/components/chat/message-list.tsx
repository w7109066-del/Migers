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
        
        return (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300",
              isOwnMessage && "flex-row-reverse space-x-reverse"
            )}
          >
            <UserAvatar
              username={message.sender.username}
              size="sm"
              isOnline={message.sender.isOnline}
              onClick={() => onUserClick(message.sender)}
              className="cursor-pointer"
            />
            <div className={cn("flex-1", isOwnMessage && "text-right")}>
              <div className={cn(
                "flex items-center space-x-2 mb-1",
                isOwnMessage && "justify-end"
              )}>
                <span className="font-semibold text-sm text-gray-800">
                  {isOwnMessage ? "You" : message.sender.username}
                </span>
                <Badge variant="secondary" className="bg-warning text-white text-xs">
                  {message.sender.level}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <div className={cn(
                "p-3 rounded-xl shadow-sm max-w-[80%]",
                isOwnMessage 
                  ? "bg-primary text-white ml-auto" 
                  : "bg-white text-gray-800"
              )}>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
