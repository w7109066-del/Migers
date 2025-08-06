import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Smile, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Lottie from "react-lottie-player";

import { gifts } from "@/animations/gifts";

// Dummy data for emoticons (replace with actual data fetching)
const emojis = [
  { emoji: "😊", name: "Smile", price: 10 },
  { emoji: "😂", name: "Laugh", price: 15 },
  { emoji: "❤️", name: "Heart", price: 20 },
  { emoji: "👍", name: "Thumbs Up", price: 5 },
  { emoji: "🌟", name: "Star", price: 25 },
  { emoji: "🎉", name: "Party Popper", price: 18 },
  { emoji: "🤔", name: "Thinking", price: 12 },
  { emoji: "🔥", name: "Fire", price: 22 },
];

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      setShowEmojis(false);
      setShowGifts(false);
    }
  };

  const handleSendGift = async (gift: any) => {
    try {
      // For room messages, we'll send gift through the regular message system
      // Format: "user sent a GiftName gift to target_user"
      // Since this is a room, we'll use a generic format
      onSendMessage(`sent a ${gift.name} gift to everyone`);
      setShowGifts(false);
    } catch (error) {
      console.error('Failed to send gift:', error);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Emoji Picker */}
      {showEmojis && (
        <div className="px-4 pt-2">
          <Card>
            <CardContent className="p-3 max-h-64 overflow-y-auto">
              <div className="mb-2 text-xs text-gray-600 font-semibold">Emoticons</div>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-10 flex items-center justify-center hover:bg-gray-100"
                    onClick={() => {
                      setMessage(prev => prev + item.emoji);
                      setShowEmojis(false);
                    }}
                    title={item.name}
                  >
                    <span className="text-lg">{item.emoji}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
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
                    className="flex flex-col items-center p-2 h-auto hover:bg-gray-100 transition-colors"
                    onClick={() => handleSendGift(gift)}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center">
                      <Lottie
                        loop
                        animationData={gift.lottie}
                        play
                        style={{ width: 32, height: 32 }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{gift.name}</span>
                    <span className="text-xs text-primary font-bold">{gift.value}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Input Form */}
      <div className="p-4 bg-white sticky bottom-0">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowEmojis(!showEmojis);
              setShowGifts(false);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <Smile className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowGifts(!showGifts);
              setShowEmojis(false);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <Gift className="w-4 h-4" />
          </Button>

          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  handleSubmit();
                }
              }
            }}
            className="flex-1 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary"
            autoComplete="off"
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={!message.trim()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}