import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";
import Lottie from "react-lottie-player";
import { 
  Send, 
  Gift, 
  Smile, 
  Image, 
  ArrowLeft,
  X 
} from "lucide-react";
import { gifts } from "@/animations/gifts";

interface CustomEmoji {
  id: string;
  name: string;
  emojiCode: string;
  fileUrl: string;
  fileType: string;
  category: string;
  isActive: boolean;
}

interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  messageType?: string;
  giftData?: {
    name: string;
    emoji: string;
    value: number;
    lottie: any;
  };
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
  const { user, isDarkMode } = useAuth();
  const { sendDirectMessage, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [showGifts, setShowGifts] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!recipient?.id || !user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/direct/${recipient.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomEmojis = async () => {
    try {
      const response = await fetch('/api/emojis/custom', {
        credentials: 'include'
      });
      if (response.ok) {
        const emojis = await response.json();
        setCustomEmojis(emojis);
      }
    } catch (error) {
      console.error('Failed to load custom emojis:', error);
    }
  };

  useEffect(() => {
    loadMessages();
    loadCustomEmojis();
  }, [recipient?.id, user?.id]);

  useEffect(() => {
    // Listen for new direct messages
    const handleNewDirectMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (
        (newMessage.senderId === recipient.id && newMessage.recipientId === user?.id) ||
        (newMessage.senderId === user?.id && newMessage.recipientId === recipient.id)
      ) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    };

    window.addEventListener('newDirectMessage', handleNewDirectMessage as EventListener);

    return () => {
      window.removeEventListener('newDirectMessage', handleNewDirectMessage as EventListener);
    };
  }, [recipient.id, user?.id]);

  const handleSendMessage = async () => {
    if ((!newMessage || !newMessage.trim()) && !selectedMedia) {
      console.log('No message content or media to send');
      return;
    }
    if (!user?.id || !recipient?.id) {
      console.error('User or recipient not available');
      return;
    }

    console.log('Sending message:', { hasText: !!newMessage?.trim(), hasMedia: !!selectedMedia });

    try {
      if (selectedMedia) {
        // Handle media message
        const formData = new FormData();
        if (newMessage && newMessage.trim()) {
          formData.append('content', newMessage.trim());
        }
        formData.append('media', selectedMedia);
        formData.append('recipientId', recipient.id);

        console.log('Sending media message to:', recipient.id);
        const response = await fetch('/api/messages/direct', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          const sentMessage = await response.json();
          console.log('Media message sent successfully:', sentMessage);
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === sentMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, sentMessage];
          });
          setNewMessage('');
          setSelectedMedia(null);
          setMediaPreview(null);
        } else {
          const errorText = await response.text();
          console.error('Failed to send media message:', response.status, errorText);
        }
      } else if (newMessage && newMessage.trim()) {
        // Handle text message via API
        console.log('Sending text message to:', recipient.id, 'content:', newMessage.trim());
        const response = await fetch('/api/messages/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: newMessage.trim(),
            recipientId: recipient.id
          }),
        });

        if (response.ok) {
          const sentMessage = await response.json();
          console.log('Text message sent successfully:', sentMessage);
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === sentMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, sentMessage];
          });
          setNewMessage('');
        } else {
          const errorText = await response.text();
          console.error('Failed to send text message:', response.status, errorText);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendGift = async (gift: any) => {
    try {
      const giftMessage = `🎁 ${gift.name} (${gift.value} coins)`;

      const response = await fetch('/api/messages/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: giftMessage,
          recipientId: recipient.id,
          messageType: 'gift',
          giftData: {
            name: gift.name,
            emoji: gift.emoji,
            value: gift.value,
            lottie: gift.lottie
          }
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        // Add message for sender immediately
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === sentMessage.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, sentMessage];
        });
        setShowGifts(false);
      } else {
        console.error('Failed to send gift');
      }
    } catch (error) {
      console.error('Failed to send gift:', error);
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

  // Animated emoticons with Lottie animations
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
    },
    {
      emoji: "😘",
      name: "Kiss",
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 60,
        "w": 50,
        "h": 50,
        "nm": "Kiss",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "heart",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"t": 0, "s": [0]},
                {"t": 15, "s": [100]},
                {"t": 45, "s": [100]},
                {"t": 60, "s": [0]}
              ]},
              "r": {"a": 0, "k": 0},
              "p": {"a": 1, "k": [
                {"t": 0, "s": [35, 25, 0]},
                {"t": 30, "s": [45, 15, 0]},
                {"t": 60, "s": [50, 10, 0]}
              ]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"t": 0, "s": [50, 50, 100]},
                {"t": 30, "s": [80, 80, 100]},
                {"t": 60, "s": [30, 30, 100]}
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
                    "s": {"a": 0, "k": [8, 8]},
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
    }
  ];

  const emojis = [
    { emoji: '😀', name: 'Grinning Face' },
    { emoji: '😃', name: 'Grinning Face with Big Eyes' },
    { emoji: '😄', name: 'Grinning Face with Smiling Eyes' },
    { emoji: '😁', name: 'Beaming Face with Smiling Eyes' },
    { emoji: '😆', name: 'Grinning Squinting Face' },
    { emoji: '😅', name: 'Grinning Face with Sweat' },
    { emoji: '🤣', name: 'Rolling on the Floor Laughing' },
    { emoji: '😂', name: 'Face with Tears of Joy' },
    { emoji: '🙂', name: 'Slightly Smiling Face' },
    { emoji: '🙃', name: 'Upside-Down Face' },
    { emoji: '😉', name: 'Winking Face' },
    { emoji: '😊', name: 'Smiling Face with Smiling Eyes' },
    { emoji: '😇', name: 'Smiling Face with Halo' },
    { emoji: '🥰', name: 'Smiling Face with Hearts' },
    { emoji: '😍', name: 'Smiling Face with Heart-Eyes' },
    { emoji: '🤩', name: 'Star-Struck' },
    { emoji: '😘', name: 'Face Blowing a Kiss' },
    { emoji: '😗', name: 'Kissing Face' },
    { emoji: '☺️', name: 'Smiling Face' },
    { emoji: '😚', name: 'Kissing Face with Closed Eyes' },
    { emoji: '😙', name: 'Kissing Face with Smiling Eyes' },
    { emoji: '🥲', name: 'Smiling Face with Tear' },
    { emoji: '😋', name: 'Face Savoring Food' },
    { emoji: '😛', name: 'Face with Tongue' },
    { emoji: '😜', name: 'Winking Face with Tongue' },
    { emoji: '🤪', name: 'Zany Face' },
    { emoji: '😝', name: 'Squinting Face with Tongue' },
    { emoji: '🤑', name: 'Money-Mouth Face' },
    { emoji: '🤗', name: 'Hugging Face' },
    { emoji: '🤭', name: 'Face with Hand Over Mouth' },
    { emoji: '🤫', name: 'Shushing Face' },
    { emoji: '🤔', name: 'Thinking Face' },
    { emoji: '🤐', name: 'Zipper-Mouth Face' },
    { emoji: '🤨', name: 'Face with Raised Eyebrow' },
    { emoji: '😐', name: 'Neutral Face' },
    { emoji: '😑', name: 'Expressionless Face' },
    { emoji: '😶', name: 'Face Without Mouth' },
    { emoji: '😏', name: 'Smirking Face' },
    { emoji: '😒', name: 'Unamused Face' },
    { emoji: '🙄', name: 'Face with Rolling Eyes' },
    { emoji: '😬', name: 'Grimacing Face' },
    { emoji: '🤥', name: 'Lying Face' },
    { emoji: '😔', name: 'Pensive Face' },
    { emoji: '😪', name: 'Sleepy Face' },
    { emoji: '🤤', name: 'Drooling Face' },
    { emoji: '😴', name: 'Sleeping Face' },
    { emoji: '😷', name: 'Face with Medical Mask' },
    { emoji: '🤒', name: 'Face with Thermometer' },
    { emoji: '🤕', name: 'Face with Head-Bandage' },
    { emoji: '🤢', name: 'Nauseated Face' },
    { emoji: '🤮', name: 'Face Vomiting' },
    { emoji: '🤧', name: 'Sneezing Face' },
    { emoji: '🥵', name: 'Hot Face' },
    { emoji: '🥶', name: 'Cold Face' },
    { emoji: '🥴', name: 'Woozy Face' },
    { emoji: '😵', name: 'Dizzy Face' },
    { emoji: '🤯', name: 'Exploding Head' },
    { emoji: '🤠', name: 'Cowboy Hat Face' },
    { emoji: '🥳', name: 'Partying Face' },
    { emoji: '😎', name: 'Smiling Face with Sunglasses' },
    { emoji: '🤓', name: 'Nerd Face' },
    { emoji: '🧐', name: 'Face with Monocle' },
    { emoji: '😕', name: 'Confused Face' },
    { emoji: '😟', name: 'Worried Face' },
    { emoji: '🙁', name: 'Slightly Frowning Face' },
    { emoji: '☹️', name: 'Frowning Face' },
    { emoji: '😮', name: 'Face with Open Mouth' },
    { emoji: '😯', name: 'Hushed Face' },
    { emoji: '😲', name: 'Astonished Face' },
    { emoji: '😳', name: 'Flushed Face' },
    { emoji: '🥺', name: 'Pleading Face' },
    { emoji: '😦', name: 'Frowning Face with Open Mouth' },
    { emoji: '😧', name: 'Anguished Face' },
    { emoji: '😨', name: 'Fearful Face' },
    { emoji: '😰', name: 'Anxious Face with Sweat' },
    { emoji: '😥', name: 'Sad but Relieved Face' },
    { emoji: '😢', name: 'Crying Face' },
    { emoji: '😭', name: 'Loudly Crying Face' },
    { emoji: '😱', name: 'Face Screaming in Fear' },
    { emoji: '😖', name: 'Confounded Face' },
    { emoji: '😣', name: 'Persevering Face' },
    { emoji: '😞', name: 'Disappointed Face' },
    { emoji: '😓', name: 'Downcast Face with Sweat' },
    { emoji: '😩', name: 'Weary Face' },
    { emoji: '😫', name: 'Tired Face' },
    { emoji: '🥱', name: 'Yawning Face' },
    { emoji: '😤', name: 'Face with Steam From Nose' },
    { emoji: '😡', name: 'Pouting Face' },
    { emoji: '😠', name: 'Angry Face' },
    { emoji: '🤬', name: 'Face with Symbols on Mouth' },
    { emoji: '😈', name: 'Smiling Face with Horns' },
    { emoji: '👿', name: 'Angry Face with Horns' },
    { emoji: '💀', name: 'Skull' },
    { emoji: '☠️', name: 'Skull and Crossbones' },
    { emoji: '💩', name: 'Pile of Poo' },
    { emoji: '🤡', name: 'Clown Face' },
    { emoji: '👹', name: 'Ogre' },
    { emoji: '👺', name: 'Goblin' },
    { emoji: '👻', name: 'Ghost' },
    { emoji: '👽', name: 'Alien' },
    { emoji: '👾', name: 'Alien Monster' },
    { emoji: '🤖', name: 'Robot' },
    { emoji: '💖', name: 'Sparkling Heart' },
    { emoji: '💕', name: 'Two Hearts' },
    { emoji: '💓', name: 'Beating Heart' },
    { emoji: '💗', name: 'Growing Heart' },
    { emoji: '💝', name: 'Heart with Ribbon' },
    { emoji: '💘', name: 'Heart with Arrow' },
    { emoji: '💙', name: 'Blue Heart' },
    { emoji: '💚', name: 'Green Heart' },
    { emoji: '💛', name: 'Yellow Heart' },
    { emoji: '🧡', name: 'Orange Heart' },
    { emoji: '💜', name: 'Purple Heart' },
    { emoji: '🖤', name: 'Black Heart' },
    { emoji: '🤍', name: 'White Heart' },
    { emoji: '🤎', name: 'Brown Heart' },
    { emoji: '❤️', name: 'Red Heart' },
    { emoji: '💔', name: 'Broken Heart' },
    { emoji: '❣️', name: 'Heart Exclamation' },
    { emoji: '💯', name: 'Hundred Points' },
    { emoji: '💢', name: 'Anger Symbol' },
    { emoji: '💥', name: 'Collision' },
    { emoji: '💫', name: 'Dizzy' },
    { emoji: '💦', name: 'Sweat Droplets' },
    { emoji: '💨', name: 'Dashing Away' },
    { emoji: '🕳️', name: 'Hole' },
    { emoji: '💣', name: 'Bomb' },
    { emoji: '💬', name: 'Speech Balloon' },
    { emoji: '👁️‍🗨️', name: 'Eye in Speech Bubble' },
    { emoji: '🗨️', name: 'Left Speech Bubble' },
    { emoji: '🗯️', name: 'Right Anger Bubble' },
    { emoji: '💭', name: 'Thought Balloon' },
    { emoji: '💤', name: 'Zzz' }
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.files?.[0] && handleMediaSelect(e.target.files[0])
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false); // Close emoji picker after selection
  };

  const handleCustomEmojiSelect = (emoji: CustomEmoji) => {
    setNewMessage(prev => prev + emoji.emojiCode); // Assuming emojiCode is the actual emoji or a placeholder
    setShowEmojis(false); // Close emoji picker after selection
  };

  return (
    <div className={cn("h-full flex flex-col", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
      {/* Chat Header */}
      <div className={cn("border-b px-4 py-3 flex items-center space-x-3 flex-shrink-0 sticky top-0 z-10", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
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
            <span className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>{recipient.username}</span>
            <Badge variant="secondary" className="bg-warning text-white text-xs">
              {recipient.level}
            </Badge>
          </div>
          <div className={`text-xs ${recipient.isOnline ? 'text-green-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                "flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-500", // Increased duration for slower animation
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
                  <span className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className={cn(
                  "p-3 rounded-xl shadow-sm max-w-[80%] inline-block",
                  isOwnMessage 
                    ? "bg-primary text-white" 
                    : isDarkMode ? "bg-gray-700 text-gray-200" : "bg-white text-gray-800"
                )}>
                  {message.messageType === 'gift' && message.giftData ? (
                    <div className={cn("flex flex-col items-center space-y-2 p-3 rounded-lg border", 
                      isDarkMode 
                        ? "bg-gradient-to-br from-orange-900/20 to-pink-900/20 border-orange-700" 
                        : "bg-gradient-to-br from-orange-100 to-pink-100 border-orange-200")}>
                      <div className="w-12 h-12 flex items-center justify-center text-2xl bg-white rounded-full shadow-sm">
                        {typeof message.giftData === 'string' ? 
                          JSON.parse(message.giftData)?.emoji || '🎁' : 
                          message.giftData?.emoji || '🎁'}
                      </div>
                      <div className="text-center">
                        <p className={cn("text-sm font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                          {typeof message.giftData === 'string' ? 
                            JSON.parse(message.giftData)?.name || 'Gift' : 
                            message.giftData?.name || 'Gift'}
                        </p>
                        <p className={cn("text-xs font-medium", isDarkMode ? "text-orange-400" : "text-orange-600")}>
                          {typeof message.giftData === 'string' ? 
                            `${JSON.parse(message.giftData)?.totalCost || JSON.parse(message.giftData)?.price || 0} coins` : 
                            `${message.giftData?.totalCost || message.giftData?.price || 0} coins`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
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
            </CardContent>
          </Card>
        </div>
      )}

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
                        setNewMessage(item.emoji);
                        handleSendMessage();
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
                    </Button>
                  ))}
                </div>
              </div>

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
                        onClick={() => handleCustomEmojiSelect(item)}
                      >
                        {item.fileType === 'image/gif' ? (
                          <img src={item.fileUrl} alt={item.name} className="w-5 h-5"/>
                        ) : (
                          <span className="text-sm">{item.emojiCode}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                      onClick={() => handleEmojiSelect(item.emoji)}
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

      {/* Message Input - Fixed positioning */}
      <div className={cn("sticky bottom-0 border-t p-4 z-10", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
        <div className="flex items-center space-x-2">
          {/* Gift Button */}
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

          {/* Emoji Button */}
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

          {/* Text Input */}
          <div className="flex-1 flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  if ((newMessage && newMessage.trim()) || selectedMedia) {
                    handleSendMessage();
                  }
                }
              }}
              className={cn("flex-1 border-0 rounded-full focus:ring-2 focus:ring-primary", 
                isDarkMode 
                  ? "bg-gray-700 text-gray-200 focus:bg-gray-600" 
                  : "bg-gray-100 focus:bg-white"
              )}
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if ((newMessage && newMessage.trim()) || selectedMedia) {
                  handleSendMessage();
                }
              }}
              disabled={(!newMessage || !newMessage.trim()) && !selectedMedia}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 py-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}