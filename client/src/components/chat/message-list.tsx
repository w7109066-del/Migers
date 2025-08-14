import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ChevronDown, MoreVertical, Reply, Forward, Copy } from "lucide-react";
import Lottie from "react-lottie-player";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { Heart, Gift, Crown, Star, MessageCircle, Eye, Info, Flag, UserMinus } from "lucide-react";

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
    profilePhotoUrl?: string; // Added profilePhotoUrl to sender interface
    isMentor?: boolean; // Added isMentor property
    isMerchant?: boolean; // Added isMerchant property
  };
  messageType?: 'action' | 'normal' | 'bot'; // Added messageType for '/me' commands and bot messages
  cardImage?: string; // Added cardImage for bot messages
}

interface MessageListProps {
  messages: Message[];
  onUserClick?: (user: { id: string; username: string; level: number; isOnline: boolean; profilePhotoUrl?: string; isMentor?: boolean; isMerchant?: boolean }) => void;
  roomName?: string;
  isAdmin?: boolean;
  currentUserId?: string;
}

interface CustomEmoji {
  id: string;
  name: string;
  emojiCode: string;
  fileUrl: string;
  fileType: string;
  category: string;
  isActive: boolean;
}

export function MessageList({ messages, onUserClick, roomName, isAdmin, currentUserId }: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hiddenGiftMessages, setHiddenGiftMessages] = useState<Set<string>>(new Set());
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const isDarkMode = true; // Assuming dark mode is active, adjust as needed

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load custom emojis for rendering
  const loadCustomEmojis = async () => {
    try {
      const response = await fetch('/api/emojis/custom', {
        credentials: 'include',
      });

      if (response.ok) {
        const emojisData = await response.json();
        setCustomEmojis(emojisData);
      } else {
        console.error('Failed to load custom emojis');
      }
    } catch (error) {
      console.error('Error loading custom emojis:', error);
    }
  };

  useEffect(() => {
    loadCustomEmojis();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-hide gift messages after 3 seconds
  useEffect(() => {
    const newGiftMessages = messages.filter(msg =>
      isGiftMessage(msg.content) && !hiddenGiftMessages.has(msg.id)
    );

    const timers: NodeJS.Timeout[] = [];

    newGiftMessages.forEach(message => {
      const timer = setTimeout(() => {
        setHiddenGiftMessages(prev => new Set([...prev, message.id]));
      }, 3000);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
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
    return content.includes('🎁GIFT:') || (content.includes('🎁 sent a') && content.includes('gift to'));
  };

  const parseGiftMessage = (content: string) => {
    // Parse new format with JSON data: "🎁GIFT:{json data}"
    const jsonMatch = content.match(/🎁GIFT:(.+)$/);
    if (jsonMatch) {
      try {
        const giftData = JSON.parse(jsonMatch[1]);
        return {
          senderName: giftData.senderName,
          giftName: giftData.giftName,
          recipientName: giftData.recipientName,
          emoji: giftData.emoji,
          value: giftData.value,
          lottie: giftData.lottie,
          isCustom: giftData.isCustom,
          fileUrl: giftData.fileUrl
        };
      } catch (e) {
        console.error('Failed to parse gift JSON:', e);
        return null;
      }
    }

    // Parse old gift messages like "🎁 sent Rose x1 (10 coins)"
    const match = content.match(/🎁\s*(.+?)\s*sent\s+(.+?)\s+gift\s+to\s+(.+?)\s*✨/i);
    if (match) {
      return {
        senderName: match[1],
        giftName: match[2],
        recipientName: match[3]
      };
    }

    // Alternative format: "🎁 sent {gift} gift to {user} ✨"
    const altMatch = content.match(/🎁\s*sent\s+(.+?)\s+gift\s+to\s+(.+?)\s*✨/i);
    if (altMatch) {
      return {
        senderName: "Someone",
        giftName: altMatch[1],
        recipientName: altMatch[2]
      };
    }

    return null;
  };

  // Animated emoticons for chat room
  const animatedEmoticons = [
    {
      emoji: "😍",
      name: "Heart Eyes",
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
                {"t": 20, "s": [120, 120, 100]},
                {"t": 40, "s": [90, 90, 100]},
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
          },
          {
            "ddd": 0,
            "ind": 2,
            "ty": 4,
            "nm": "hearts",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"t": 0, "s": [0]},
                {"t": 15, "s": [100]},
                {"t": 45, "s": [100]},
                {"t": 60, "s": [0]}
              ]},
              "r": {"a": 0, "k": 0},
              "p": {"a": 0, "k": [20, 18, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"t": 0, "s": [80, 80, 100]},
                {"t": 30, "s": [120, 120, 100]},
                {"t": 60, "s": [80, 80, 100]}
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
                    "s": {"a": 0, "k": [6, 6]},
                    "p": {"a": 0, "k": [0, 0]}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.2, 0.4, 1]},
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
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 90,
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
            "nm": "face",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 0, "k": 0},
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
          },
          {
            "ddd": 0,
            "ind": 2,
            "ty": 4,
            "nm": "stars",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"t": 0, "s": [50]},
                {"t": 30, "s": [100]},
                {"t": 60, "s": [50]},
                {"t": 90, "s": [100]}
              ]},
              "r": {"a": 1, "k": [
                {"t": 0, "s": [0]},
                {"t": 45, "s": [180]},
                {"t": 90, "s": [360]}
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
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 120,
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
            "nm": "face",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 0, "k": 0},
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
          },
          {
            "ddd": 0,
            "ind": 2,
            "ty": 4,
            "nm": "confetti1",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"t": 0, "s": [0]},
                {"t": 20, "s": [100]},
                {"t": 70, "s": [100]},
                {"t": 90, "s": [0]},
                {"t": 110, "s": [100]},
                {"t": 120, "s": [0]}
              ]},
              "r": {"a": 1, "k": [
                {"t": 0, "s": [0]},
                {"t": 60, "s": [180]},
                {"t": 120, "s": [360]}
              ]},
              "p": {"a": 1, "k": [
                {"t": 0, "s": [15, 10, 0]},
                {"t": 30, "s": [15, 35, 0]},
                {"t": 60, "s": [15, 10, 0]},
                {"t": 90, "s": [15, 40, 0]},
                {"t": 120, "s": [15, 10, 0]}
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
          },
          {
            "ddd": 0,
            "ind": 3,
            "ty": 4,
            "nm": "confetti2",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"t": 10, "s": [0]},
                {"t": 30, "s": [100]},
                {"t": 80, "s": [100]},
                {"t": 100, "s": [0]},
                {"t": 120, "s": [100]}
              ]},
              "r": {"a": 1, "k": [
                {"t": 0, "s": [45]},
                {"t": 60, "s": [225]},
                {"t": 120, "s": [405]}
              ]},
              "p": {"a": 1, "k": [
                {"t": 10, "s": [35, 15, 0]},
                {"t": 40, "s": [35, 40, 0]},
                {"t": 70, "s": [35, 15, 0]},
                {"t": 100, "s": [35, 45, 0]},
                {"t": 120, "s": [35, 15, 0]}
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
                    "c": {"a": 0, "k": [0.3, 0.8, 1, 1]},
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
      emoji: "😀",
      name: "Grinning Face",
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 60,
        "w": 50,
        "h": 50,
        "nm": "Grinning Face",
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
    }
  ];

  const handleKickUser = async (user: any) => {
    console.log("Kick user:", user.username);
    // Send kick request to server
    try {
      const roomId = window.location.pathname.split('/').pop();
      const response = await fetch(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        console.log(`${user.username} has been kicked`);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
    }
  };

  const handleReportUser = (user: any) => {
    console.log("Report user:", user.username);
    // TODO: Implement report functionality
    alert(`Report feature for ${user.username} will be implemented soon`);
  };

  const handleUserInfo = (username: string) => {
    console.log("Show info for user:", username);
    // Send whois command to get user info
    const roomId = window.location.pathname.split('/').pop();
    const whoisMessage = {
      content: `/whois ${username}`,
      roomId: roomId,
      recipientId: null
    };

    // Trigger whois command through websocket or API call
    window.dispatchEvent(new CustomEvent('sendWhoisCommand', { detail: whoisMessage }));
  };

  const handleViewProfile = (user: any) => {
    console.log("View profile for user:", user.username);
    // Open user profile or chat
    if (onUserClick) {
      onUserClick({
        id: user.id,
        username: user.username,
        level: user.level,
        isOnline: user.isOnline,
        profilePhotoUrl: user.profilePhotoUrl,
        isMentor: user.isMentor,
        isMerchant: user.isMerchant
      });
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return content;

    // Process custom emojis first
    let processedContent = content;
    customEmojis.forEach(emoji => {
      // Ensure emoji.emojiCode is treated literally, escaping special regex characters
      const escapedEmojiCode = emoji.emojiCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedEmojiCode, 'g');
      processedContent = processedContent.replace(
        regex,
        `<img src="${emoji.fileUrl}" alt="${emoji.name}" class="inline-block w-6 h-6 object-contain align-middle" title="${emoji.name}" />`
      );
    });

    // Then process other message types like /me or gifts
    if (processedContent.startsWith('/me ')) {
      return `<span class="italic text-purple-700 dark:text-purple-400">${processedContent.substring(4)}</span>`;
    }
    if (processedContent.includes('🎁 sent')) {
      return `
        <div class="inline-block p-2 bg-gradient-to-r from-orange-100 to-pink-100 rounded-lg border border-orange-200 ml-1">
          <span class="text-sm font-medium text-orange-700">${processedContent}</span>
        </div>
      `;
    }
    return processedContent;
  };


  const renderGift = (giftData: any) => {
    // Check if this is a built-in emoji animation first
    const animatedEmoji = animatedEmoticons.find(emoji => emoji.emoji === giftData.emoji);

    if (animatedEmoji) {
      return (
        <div className="inline-flex items-center space-x-2">
          <div className="w-8 h-8">
            <Lottie
              loop={true}
              animationData={animatedEmoji.lottie}
              play={true}
              style={{ width: 32, height: 32 }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700">{giftData.name}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.senderId === user?.id;
        const isSystemMessage = message.senderId === 'system';
        const isGift = isGiftMessage(message.content);
        const isBotMessage = message.messageType === 'bot';

        // Gift message rendering with auto-hide after 3 seconds
        if (isGift) {
          const giftData = parseGiftMessage(message.content);
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
                      {giftData?.recipientName || giftData?.recipient}
                    </div>
                    {giftData?.value && (
                      <div className="text-yellow-600 font-bold text-xs mt-1">
                        {giftData.value} coins
                      </div>
                    )}
                  </div>
                  <div className="text-3xl animate-spin" style={{animationDuration: '2s'}}>✨</div>
                </div>
                {giftData && giftData.lottie && (
                  <div className="flex justify-center mt-2">
                    <Lottie
                      loop
                      animationData={giftData.lottie}
                      play
                      style={{ width: 80, height: 80 }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Bot message rendering - handle both bot messageType and bot sender names
        if (isBotMessage || message.sender.username === 'LowCardBot') {
          return (
            <div key={message.id} className="flex items-start space-x-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-green-400 text-sm">
                    {message.sender.username}:
                  </span>
                  <div className="text-sm text-blue-400 flex items-center gap-1">
                    <span>{message.content}</span>
                    {message.cardImage && (
                      <img 
                        src={message.cardImage} 
                        alt="Card" 
                        className="w-4 h-6 object-contain inline-block ml-1"
                      />
                    )}
                  </div>
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
          const isWhoisMessage = message.content.includes('📋 User Info for') || message.content.includes('❌ User') || message.content.includes('LowcardBot has joined');

          return (
            <div key={message.id} className="mb-2">
              <div className="text-sm">
                {isWelcomeMessage && (
                  <div>
                    <span className="text-red-500 font-medium">{roomName || 'System'}: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isCurrentlyInRoom && (
                  <div>
                    <span className="text-red-500 font-medium">{roomName || 'System'}: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isRoomManaged && (
                  <div>
                    <span className="text-red-500 font-medium">{roomName || 'System'}: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isUserEnterLeave && (
                  <div>
                    <span className="text-red-500 font-medium">{roomName || 'System'}: </span>
                    <span className="text-gray-800">{message.content}</span>
                  </div>
                )}
                {isWhoisMessage && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                    <div className="text-blue-700">
                      <pre className="whitespace-pre-wrap font-mono text-sm">{message.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Render /me action messages or regular messages
        return (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-3 group",
              message.messageType === 'action' && "italic text-purple-700"
            )}
          >
            <UserAvatar
              src={message.sender.profilePhotoUrl || ""}
              alt={message.sender.username}
              fallback={isBotMessage ? '🤖' : message.sender.username[0]}
              className="w-8 h-8 flex-shrink-0"
              level={message.sender.level}
              isOnline={message.sender.isOnline}
              onClick={() => onUserClick?.(message.sender)}
            />
            <div className="flex-grow min-w-0">
              <div className="flex items-start space-x-1">
                <span
                  className={cn(
                    "font-semibold text-sm cursor-pointer",
                    isBotMessage ? "text-blue-600" : // Bot message color
                    isCurrentUser ? "text-green-700" : // Own message color (dark green)
                    // Admin color (orange tua) visible in all rooms
                    (() => {
                      const currentRoomId = window.location.pathname.split('/').pop();
                      // Admin color visible in all rooms - Dark orange
                      if (message.sender.level >= 5) return "text-orange-800"; // Admin dark orange
                      // Merchant color - Purple (check for isMerchant property)
                      if (message.sender.isMerchant === true || message.sender.isMerchant) return "text-purple-600"; // Merchant purple
                      // Owner and moderator colors only in user-created rooms (not system rooms 1-4)
                      if (!['1', '2', '3', '4'].includes(currentRoomId || '')) {
                        // Check if user is room owner (username matches room name)
                        if (message.sender.username.toLowerCase() === roomName?.toLowerCase()) return "text-yellow-500"; // Owner
                        if (message.sender.level >= 3 && message.sender.level < 5) return "text-amber-600"; // Moderator
                      }
                      // Default user role color (blue)
                      return "text-blue-600";
                    })()
                  )}
                  onClick={() => {
                    if (message.senderId !== 'system' && onUserClick) {
                      onUserClick({
                        id: message.sender.id,
                        username: message.sender.username,
                        level: message.sender.level,
                        status: "Available for chat", // Assuming a default status if not provided
                        isOnline: message.sender.isOnline,
                        profilePhotoUrl: message.sender.profilePhotoUrl,
                        isMentor: message.sender.isMentor,
                        isMerchant: message.sender.isMerchant
                      });
                    }
                  }}
                >
                  {message.sender.username}:
                </span>
                
                <div className="flex-1 min-w-0">
                  {message.messageType === 'action' ? (
                    <div className="italic text-purple-700 dark:text-purple-400 text-sm">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2">
                      <div
                        className="text-sm break-words flex-1"
                        dangerouslySetInnerHTML={{
                          __html: renderMessageContent(message.content)
                        }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        ({formatTime(message.createdAt)})
                      </span>
                    </div>
                  )}
                  
                  {message.cardImage && (
                    <div className="mt-2">
                      <img
                        src={message.cardImage}
                        alt="Card"
                        className="w-16 h-24 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center space-x-1 ml-2">
                  {message.sender.isMentor && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1 py-0 dark:bg-red-900/20 dark:text-red-200">
                      M
                    </Badge>
                  )}
                  {message.sender.isMerchant && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1 py-0 dark:bg-purple-900/20 dark:text-purple-200">
                      🛍️
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}