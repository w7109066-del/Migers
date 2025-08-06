
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";
import { 
  Send, 
  Gift, 
  Smile, 
  Image, 
  ArrowLeft,
  X 
} from "lucide-react";

interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
  };
}

interface DirectMessageChatProps {
  recipient: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
  };
  onBack: () => void;
}

export function DirectMessageChat({ recipient, onBack }: DirectMessageChatProps) {
  const { user } = useAuth();
  const { sendDirectMessage, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load existing direct messages
    loadDirectMessages();
  }, [recipient.id]);

  useEffect(() => {
    // Listen for new direct messages
    const handleNewDirectMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (
        (newMessage.senderId === recipient.id && newMessage.recipientId === user?.id) ||
        (newMessage.senderId === user?.id && newMessage.recipientId === recipient.id)
      ) {
        setMessages(prev => [...prev, newMessage]);
      }
    };

    window.addEventListener('newDirectMessage', handleNewDirectMessage as EventListener);
    
    return () => {
      window.removeEventListener('newDirectMessage', handleNewDirectMessage as EventListener);
    };
  }, [recipient.id, user?.id]);

  const loadDirectMessages = async () => {
    try {
      const response = await fetch(`/api/messages/direct/${recipient.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const directMessages = await response.json();
        setMessages(directMessages);
      }
    } catch (error) {
      console.error('Failed to load direct messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedMedia) return;

    try {
      if (selectedMedia) {
        // Handle media message
        const formData = new FormData();
        if (newMessage.trim()) {
          formData.append('content', newMessage);
        }
        formData.append('media', selectedMedia);
        formData.append('recipientId', recipient.id);

        const response = await fetch('/api/messages/direct', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          setNewMessage('');
          setSelectedMedia(null);
          setMediaPreview(null);
          await loadDirectMessages();
        }
      } else {
        // Handle text message
        sendDirectMessage(newMessage.trim(), recipient.id);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMediaSelect = (file: File) => {
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const gifts = [
    { emoji: '🎁', name: 'Gift Box', value: 10 },
    { emoji: '🌹', name: 'Rose', value: 5 },
    { emoji: '💎', name: 'Diamond', value: 50 },
    { emoji: '👑', name: 'Crown', value: 100 },
    { emoji: '🍰', name: 'Cake', value: 15 },
    { emoji: '🎈', name: 'Balloon', value: 3 },
    { emoji: '⭐', name: 'Star', value: 20 },
    { emoji: '💝', name: 'Heart Gift', value: 25 },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <UserAvatar
          username={recipient.username}
          size="md"
          isOnline={recipient.isOnline}
        />
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-800">{recipient.username}</span>
            <Badge variant="secondary" className="bg-warning text-white text-xs">
              {recipient.level}
            </Badge>
          </div>
          <div className={`text-xs ${recipient.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {recipient.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              />
              <div className={cn("flex-1", isOwnMessage && "text-right")}>
                <div className={cn(
                  "flex items-center space-x-2 mb-1",
                  isOwnMessage && "justify-end"
                )}>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className={cn(
                  "p-3 rounded-xl shadow-sm max-w-[80%] inline-block",
                  isOwnMessage 
                    ? "bg-primary text-white" 
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

      {/* Media Preview */}
      {mediaPreview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img 
              src={mediaPreview} 
              alt="Preview" 
              className="max-h-24 rounded-lg object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 bg-black/50 text-white hover:bg-black/70 p-1"
              onClick={removeMedia}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Gift Picker */}
      {showGifts && (
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-4 gap-2">
                {gifts.map((gift, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 h-auto"
                    onClick={() => {
                      setNewMessage(prev => prev + gift.emoji);
                      setShowGifts(false);
                    }}
                  >
                    <span className="text-lg">{gift.emoji}</span>
                    <span className="text-xs text-gray-500">{gift.value}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3 max-h-32 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8"
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojis(false);
                    }}
                  >
                    <span className="text-sm">{emoji}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          {/* Gift Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-orange-600 p-2"
            onClick={() => {
              setShowGifts(!showGifts);
              setShowEmojis(false);
            }}
          >
            <Gift className="w-5 h-5" />
          </Button>

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-yellow-600 p-2"
            onClick={() => {
              setShowEmojis(!showEmojis);
              setShowGifts(false);
            }}
          >
            <Smile className="w-5 h-5" />
          </Button>

          {/* Photo Upload */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0])}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-blue-600 p-2"
              asChild
            >
              <span className="cursor-pointer">
                <Image className="w-5 h-5" />
              </span>
            </Button>
          </label>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="pr-12 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Send Button */}
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !selectedMedia}
            className="bg-primary hover:bg-primary/90 text-white p-3 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
