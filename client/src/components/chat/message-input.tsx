import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Smile, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Lottie from "react-lottie-player";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

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

// Animated emoticons with proper Lottie animations
const animatedEmoticons = [
  {
    emoji: "😍",
    name: "Heart Eyes",
    price: 30,
    lottie: {
      "v": "5.7.4",
      "fr": 30,
      "ip": 0,
      "op": 60,
      "w": 50,
      "h": 50,
      "nm": "Heart Eyes",
      "ddd": 0,
      "assets": [],
      "layers": [
        {
          "ddd": 0,
          "ind": 1,
          "ty": 4,
          "nm": "face",
          "sr": 1,
          "ks": {
            "o": {"a": 0, "k": 100},
            "r": {"a": 0, "k": 0},
            "p": {"a": 0, "k": [25, 25, 0]},
            "a": {"a": 0, "k": [0, 0, 0]},
            "s": {"a": 1, "k": [
              {"t": 0, "s": [100, 100, 100]},
              {"t": 30, "s": [110, 110, 100]},
              {"t": 60, "s": [100, 100, 100]}
            ]}
          },
          "ao": 0,
          "shapes": [
            {
              "ty": "gr",
              "it": [
                {
                  "ty": "el",
                  "d": 1,
                  "s": {"a": 0, "k": [40, 40]},
                  "p": {"a": 0, "k": [0, 0]}
                },
                {
                  "ty": "fl",
                  "c": {"a": 0, "k": [1, 0.8, 0.2, 1]},
                  "o": {"a": 0, "k": 100}
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    emoji: "🤩",
    name: "Star Struck",
    price: 35,
    lottie: {
      "v": "5.7.4",
      "fr": 30,
      "ip": 0,
      "op": 60,
      "w": 50,
      "h": 50,
      "nm": "Star Struck",
      "ddd": 0,
      "assets": [],
      "layers": [
        {
          "ddd": 0,
          "ind": 1,
          "ty": 4,
          "nm": "stars",
          "sr": 1,
          "ks": {
            "o": {"a": 1, "k": [
              {"t": 0, "s": [50]},
              {"t": 30, "s": [100]},
              {"t": 60, "s": [50]}
            ]},
            "r": {"a": 1, "k": [
              {"t": 0, "s": [0]},
              {"t": 60, "s": [360]}
            ]},
            "p": {"a": 0, "k": [25, 25, 0]},
            "a": {"a": 0, "k": [0, 0, 0]},
            "s": {"a": 0, "k": [100, 100, 100]}
          },
          "ao": 0,
          "shapes": [
            {
              "ty": "gr",
              "it": [
                {
                  "ty": "sr",
                  "d": 1,
                  "pt": {"a": 0, "k": 5},
                  "p": {"a": 0, "k": [0, 0]},
                  "r": {"a": 0, "k": 0},
                  "ir": {"a": 0, "k": 8},
                  "or": {"a": 0, "k": 15}
                },
                {
                  "ty": "fl",
                  "c": {"a": 0, "k": [1, 1, 0, 1]},
                  "o": {"a": 0, "k": 100}
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    emoji: "🥳",
    name: "Party Face",
    price: 40,
    lottie: {
      "v": "5.7.4",
      "fr": 30,
      "ip": 0,
      "op": 90,
      "w": 50,
      "h": 50,
      "nm": "Party Face",
      "ddd": 0,
      "assets": [],
      "layers": [
        {
          "ddd": 0,
          "ind": 1,
          "ty": 4,
          "nm": "confetti",
          "sr": 1,
          "ks": {
            "o": {"a": 1, "k": [
              {"t": 0, "s": [0]},
              {"t": 20, "s": [100]},
              {"t": 70, "s": [100]},
              {"t": 90, "s": [0]}
            ]},
            "r": {"a": 1, "k": [
              {"t": 0, "s": [0]},
              {"t": 90, "s": [180]}
            ]},
            "p": {"a": 1, "k": [
              {"t": 0, "s": [25, 15, 0]},
              {"t": 45, "s": [25, 35, 0]},
              {"t": 90, "s": [25, 15, 0]}
            ]},
            "a": {"a": 0, "k": [0, 0, 0]},
            "s": {"a": 0, "k": [80, 80, 100]}
          },
          "ao": 0,
          "shapes": [
            {
              "ty": "gr",
              "it": [
                {
                  "ty": "rc",
                  "d": 1,
                  "s": {"a": 0, "k": [4, 4]},
                  "p": {"a": 0, "k": [0, 0]},
                  "r": {"a": 0, "k": 1}
                },
                {
                  "ty": "fl",
                  "c": {"a": 0, "k": [1, 0.3, 0.5, 1]},
                  "o": {"a": 0, "k": 100}
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  roomId?: string;
}

export function MessageInput({ onSendMessage, roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<any[]>([]); // Changed to any[] as per original
  const inputRef = useRef<HTMLInputElement>(null);
  const { isConnected } = useWebSocket();
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  // Store input text per room ID to preserve text when switching rooms
  const [roomInputs, setRoomInputs] = useState<Map<string, string>>(new Map());
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(roomId);

  // Function to handle insertion of emoji into the message
  const insertEmoji = (emoji: string) => {
    setMessage((prevMessage) => prevMessage + emoji);
  };

  // Fetch custom emojis when the component mounts or when roomId changes
  useEffect(() => {
    const fetchCustomEmojis = async () => {
      try {
        console.log('MessageInput: Fetching custom emojis...');
        const response = await fetch('/api/emojis/custom', {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error('MessageInput: Failed to fetch custom emojis, status:', response.status);
          throw new Error('Failed to fetch custom emojis');
        }
        const data = await response.json();
        console.log('MessageInput: Fetched custom emojis:', data);
        console.log('MessageInput: Number of custom emojis:', data.length);
        setCustomEmojis(data);
      } catch (error) {
        console.error('MessageInput: Error fetching custom emojis:', error);
        setCustomEmojis([]);
      }
    };

    fetchCustomEmojis();

    // Only update if roomId actually changed
    if (currentRoomId !== roomId) {
      // Save current message to previous room's storage before switching
      if (currentRoomId && message.trim()) {
        setRoomInputs(prev => {
          const newMap = new Map(prev);
          newMap.set(currentRoomId, message);
          return newMap;
        });
      }

      // Restore message for new room
      if (roomId) {
        const savedMessage = roomInputs.get(roomId) || '';
        setMessage(savedMessage);
      } else {
        setMessage('');
      }

      setCurrentRoomId(roomId);
    }

    // Clear typing timer when room changes
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }
  }, [roomId, currentRoomId, message, typingTimer]);

  const [isSubmitting, setIsSubmitting] = useState(false); // Added isSubmitting state

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (message.trim() && !isSubmitting) {
      setIsSubmitting(true);

      // Check if we have a valid connection before sending
      console.log('Attempting to send message:', message.trim());
      // Check if message is /add bot command
      if (message.startsWith('/add bot lowcard')) {
        // Send the command but don't show it in chat
        onSendMessage(message);
        setMessage("");
        setShowEmojis(false);
        setShowGifts(false);

        // Reset submission state after a short delay
        setTimeout(() => {
          setIsSubmitting(false);
        }, 100);
        return;
      }

      // Check if message is a whois command
      const whoisCommandRegex = /^\/whois\s+(.+)$/i;
      const whoisMatch = message.match(whoisCommandRegex);

      if (whoisMatch) {
        const [, username] = whoisMatch;
        // Send whois command to server
        onSendMessage(`/whois ${username.trim()}`);
        setMessage("");
        setShowEmojis(false);
        setShowGifts(false);

        // Reset submission state after a short delay
        setTimeout(() => {
          setIsSubmitting(false);
        }, 100);
        return;
      }

      // Check if message is a /me command
      const meCommandRegex = /^\/me\s*(.*)$/i;
      const meMatch = message.match(meCommandRegex);

      if (meMatch) {
        const [, actionText] = meMatch;
        // Send /me command to server
        onSendMessage(`/me ${actionText.trim()}`);
        setMessage("");
        setShowEmojis(false);
        setShowGifts(false);

        // Reset submission state after a short delay
        setTimeout(() => {
          setIsSubmitting(false);
        }, 100);
        return;
      }

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

      // Clear message and room storage for current room
      setMessage("");
      if (roomId) {
        setRoomInputs(prev => {
          const newMap = new Map(prev);
          newMap.delete(roomId); // Remove saved input for this room after sending
          return newMap;
        });
      }
      setShowEmojis(false);
      setShowGifts(false);

      // Reset submission state after a short delay
      setTimeout(() => {
        setIsSubmitting(false);
      }, 100);
    }
  };

  const handleSendGift = async (gift: any) => {
    try {
      // For room messages, we'll send gift through the regular message system
      // Format that will be recognized by message-list as gift message
      if (gift.isCustom) {
        onSendMessage(`🎁GIFT:${JSON.stringify({
          senderName: 'You',
          giftName: gift.name,
          recipientName: 'everyone in the room',
          emoji: gift.emoji,
          value: 15, // Default value for custom emojis
          fileUrl: gift.fileUrl,
          isCustom: true
        })}`);
      } else {
        onSendMessage(`🎁GIFT:${JSON.stringify({
          senderName: 'You',
          giftName: gift.name,
          recipientName: 'everyone in the room',
          emoji: gift.emoji,
          value: gift.value,
          lottie: gift.lottie
        })}`);
      }
      setShowGifts(false);
    } catch (error) {
      console.error('Failed to send gift:', error);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="w-full bg-white fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 shadow-lg">
      {/* Emoji Picker */}
      {showEmojis && (
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3 max-h-40 overflow-y-auto">
              {/* Custom Emojis Section */}
              {customEmojis.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Custom Emojis</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {customEmojis.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 flex flex-col items-center"
                        onClick={() => {
                          insertEmoji(item.emojiCode);
                          setShowEmojis(false);
                        }}
                        title={item.name}
                      >
                        {item.fileType?.includes('gif') || item.fileUrl?.includes('.gif') ? (
                          <img
                            src={item.fileUrl}
                            alt={item.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              console.error('Failed to load custom emoji:', item.fileUrl);
                              // Fallback to emoji code as text
                              e.currentTarget.outerHTML = `<span class="text-xs">${item.emojiCode}</span>`;
                            }}
                          />
                        ) : (
                          <img
                            src={item.fileUrl}
                            alt={item.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              console.error('Failed to load custom emoji:', item.fileUrl);
                              // Fallback to emoji code as text
                              e.currentTarget.outerHTML = `<span class="text-xs">${item.emojiCode}</span>`;
                            }}
                          />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                        // Langsung kirim emoji animasi ke room
                        onSendMessage(item.emoji);
                        setShowEmojis(false);
                      }}
                    >
                      <div className="w-6 h-6 mb-1">
                        <Lottie
                          loop={true}
                          animationData={item.lottie}
                          play={true}
                          style={{ width: 24, height: 24 }}
                          rendererSettings={{
                            preserveAspectRatio: 'xMidYMid slice'
                          }}
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
                        insertEmoji(item.emoji); // Use insertEmoji to append
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
              {/* Custom Emoji Gifts Section */}
              {customEmojis.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Custom Emoji Gifts</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {customEmojis.map((emoji) => (
                      <Button
                        key={`custom-gift-${emoji.id}`}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col items-center p-2 h-auto hover:bg-gray-100 transition-colors"
                        onClick={() => handleSendGift({
                          name: emoji.name,
                          emoji: emoji.emojiCode,
                          value: 15, // Default value for custom emojis
                          fileUrl: emoji.fileUrl,
                          isCustom: true
                        })}
                      >
                        <div className="w-8 h-8 mb-1 flex items-center justify-center">
                          <img
                            src={emoji.fileUrl}
                            alt={emoji.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              console.error('Failed to load custom emoji gift:', emoji.fileUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{emoji.name}</span>
                        <span className="text-xs text-primary font-bold">15</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Gifts Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Default Gifts</h4>
                <div className="grid grid-cols-4 gap-2">
                  {gifts.map((gift, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center p-2 h-auto hover:bg-gray-100 transition-colors"
                      onClick={() => handleSendGift(gift)}
                    >
                      <div className="w-8 h-8 mb-1">
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Input Form */}
      <div className="p-4 bg-white w-full">
        <div className="flex items-center space-x-2 w-full">
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
            placeholder={!isConnected ? "Connecting..." : "Type a message, /whois {username}, /me {action}, /send {gift} to {user}, !bot, !start <bet>, !j, !d..."}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Save current input to room storage in real-time
              if (roomId && e.target.value) {
                setRoomInputs(prev => {
                  const newMap = new Map(prev);
                  newMap.set(roomId, e.target.value);
                  return newMap;
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSubmitting) {
                e.preventDefault();
                if (message.trim() && isConnected) {
                  handleSubmit();
                }
              }
            }}
            className={cn(
              "flex-1 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary",
              !isConnected && "bg-red-50 text-red-500"
            )}
            autoComplete="off"
            disabled={!isConnected}
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={!message.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}