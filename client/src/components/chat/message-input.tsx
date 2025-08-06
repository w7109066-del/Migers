import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Smile, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Lottie from "react-lottie-player";

// Dummy data for emoticons and gifts (replace with actual data fetching)
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

const gifts = [
  { name: "Rose", value: 50, lottie: "/lotties/rose.json" }, // Placeholder for Lottie animation JSON
  { name: "Cake", value: 100, lottie: "/lotties/cake.json" },
  { name: "Gift Box", value: 75, lottie: "/lotties/giftbox.json" },
  { name: "Crown", value: 150, lottie: "/lotties/crown.json" },
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
      onSendMessage(`🎁 ${gift.emoji || gift.name} (${gift.value} coins)`);
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
        <div className="px-4 pt-2">
          <Card>
            <CardContent className="p-3">
              <div className="mb-2 text-xs text-gray-600 font-semibold">Gifts (Coin Cost)</div>
              <div className="grid grid-cols-4 gap-2">
                {gifts.map((gift, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 h-auto hover:bg-gray-100 transition-colors border border-gray-200 rounded-lg"
                    onClick={() => handleSendGift(gift)}
                  >
                    <div className="w-10 h-10 mb-1">
                      {/* Placeholder for Lottie animation - ensure correct path and animation data */}
                      {gift.lottie && (
                        <Lottie
                          loop
                          animationData={gift.lottie}
                          play
                          style={{ width: 40, height: 40 }}
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-700 truncate max-w-full">{gift.name}</div>
                      <div className="text-xs text-primary font-bold">{gift.value} coins</div>
                    </div>
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
            className="text-orange-600 p-2 flex-shrink-0"
            onClick={() => {
              setShowGifts(!showGifts);
              setShowEmojis(false);
            }}
          >
            <Gift className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-yellow-600 p-2 flex-shrink-0"
            onClick={() => {
              setShowEmojis(!showEmojis);
              setShowGifts(false);
            }}
          >
            <Smile className="w-5 h-5" />
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
            type="button"
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