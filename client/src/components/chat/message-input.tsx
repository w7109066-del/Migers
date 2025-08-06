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

// Dummy data for animated emoticons (replace with actual data)
const animatedEmoticons = [
  { emoji: "🌟", name: "Sparkle", price: 30, lottie: gifts[0].lottie }, // Assuming gifts[0].lottie is a valid animation
  { emoji: "💖", name: "Heartbeat", price: 35, lottie: gifts[1].lottie }, // Assuming gifts[1].lottie is a valid animation
  { emoji: "🚀", name: "Rocket", price: 40, lottie: gifts[2].lottie }, // Assuming gifts[2].lottie is a valid animation
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
      // Check if message is a gift command
      const giftCommandRegex = /^\/send\s+(.+?)\s+to\s+(.+)$/i;
      const match = message.match(giftCommandRegex);

      if (match) {
        const [, giftName, recipientName] = match;

        // Find matching gift from animations
        const matchedGift = gifts.find(gift =>
          gift.name.toLowerCase().includes(giftName.toLowerCase()) ||
          giftName.toLowerCase().includes(gift.name.toLowerCase())
        );

        if (matchedGift) {
          // Send formatted gift message with animation data
          const giftMessage = `🎁GIFT:${JSON.stringify({
            senderName: 'You',
            giftName: matchedGift.name,
            recipientName: recipientName.trim(),
            emoji: matchedGift.emoji,
            value: matchedGift.value,
            lottie: matchedGift.lottie
          })}`;
          onSendMessage(giftMessage);
        } else {
          // Fallback for unknown gifts
          const giftMessage = `🎁 sent ${giftName.trim()} gift to ${recipientName.trim()} ✨`;
          onSendMessage(giftMessage);
        }
      } else {
        onSendMessage(message);
      }

      setMessage("");
      setShowEmojis(false);
      setShowGifts(false);
    }
  };

  const handleSendGift = async (gift: any) => {
    try {
      // For room messages, we'll send gift through the regular message system
      // Format that will be recognized by message-list as gift message
      onSendMessage(`🎁 sent a ${gift.name} gift to everyone in the room ✨`);
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
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3 max-h-40 overflow-y-auto">
              {/* Animated Emoticons Section */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Animated Emoticons</h4>
                <div className="grid grid-cols-6 gap-2">
                  {animatedEmoticons.map((item, index) => (
                    <Button
                      key={`animated-${index}`}
                      variant="ghost"
                      size="sm"
                      className="p-2 h-auto flex flex-col items-center hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setMessage(prev => prev + item.emoji);
                        setShowEmojis(false);
                      }}
                    >
                      <div className="w-6 h-6 mb-1">
                        <Lottie
                          loop
                          animationData={item.lottie}
                          play
                          style={{ width: 24, height: 24 }}
                        />
                      </div>
                      <span className="text-xs text-primary font-bold">{item.price}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Regular Emojis Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Regular Emojis</h4>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((item, index) => (
                    <Button
                      key={`regular-${index}`}
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 flex flex-col items-center"
                      onClick={() => {
                        setMessage(prev => prev + item.emoji);
                        setShowEmojis(false);
                      }}
                    >
                      <span className="text-sm">{item.emoji}</span>
                    </Button>
                  ))}
                </div>
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
            placeholder="Type a message or /send {gift} to {user}..."
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