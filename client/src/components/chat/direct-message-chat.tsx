
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
          const sentMessage = await response.json();
          // Add message for sender immediately
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
          console.error('Failed to send media message');
        }
      } else {
        // Handle text message via API
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
          // Add message for sender immediately
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === sentMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, sentMessage];
          });
          setNewMessage('');
        } else {
          console.error('Failed to send message');
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

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const gifts = [
    { 
      emoji: '🎁', 
      name: 'Gift Box', 
      value: 10,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 60,
        "w": 100,
        "h": 100,
        "nm": "Gift Box",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "gift",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 30, "s": [10]},
                {"t": 60, "s": [0]}
              ]},
              "p": {"a": 0, "k": [50, 50, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 15, "s": [110, 110, 100]},
                {"t": 60, "s": [100, 100, 100]}
              ]}
            },
            "ao": 0,
            "shapes": [
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "rc",
                    "d": 1,
                    "s": {"a": 0, "k": [30, 25]},
                    "p": {"a": 0, "k": [0, 5]},
                    "r": {"a": 0, "k": 3}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [0.8, 0.2, 0.2, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 60,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '🌹', 
      name: 'Rose', 
      value: 5,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 90,
        "w": 100,
        "h": 100,
        "nm": "Rose",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "rose",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [100]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 30, "s": [80]},
                {"t": 90, "s": [100]}
              ]},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 45, "s": [15]},
                {"t": 90, "s": [0]}
              ]},
              "p": {"a": 0, "k": [50, 50, 0]},
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
                    "s": {"a": 0, "k": [20, 20]},
                    "p": {"a": 0, "k": [0, -10]}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [0.9, 0.1, 0.3, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 90,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '💎', 
      name: 'Diamond', 
      value: 50,
      lottie: {
        "v": "5.7.4",
        "fr": 60,
        "ip": 0,
        "op": 120,
        "w": 100,
        "h": 100,
        "nm": "Diamond",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "diamond",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [100]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 60, "s": [80]},
                {"t": 120, "s": [100]}
              ]},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"t": 120, "s": [360]}
              ]},
              "p": {"a": 0, "k": [50, 50, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 60, "s": [120, 120, 100]},
                {"t": 120, "s": [100, 100, 100]}
              ]}
            },
            "ao": 0,
            "shapes": [
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "sr",
                    "sy": 1,
                    "d": 1,
                    "pt": {"a": 0, "k": 4},
                    "p": {"a": 0, "k": [0, 0]},
                    "r": {"a": 0, "k": 45},
                    "ir": {"a": 0, "k": 8},
                    "or": {"a": 0, "k": 15}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [0.2, 0.8, 1, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 120,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '👑', 
      name: 'Crown', 
      value: 100,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 90,
        "w": 100,
        "h": 100,
        "nm": "Crown",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "crown",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 45, "s": [-5]},
                {"t": 90, "s": [0]}
              ]},
              "p": {"a": 1, "k": [
                {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [50, 50, 0]},
                {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 30, "s": [50, 45, 0]},
                {"t": 90, "s": [50, 50, 0]}
              ]},
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
                    "sy": 1,
                    "d": 1,
                    "pt": {"a": 0, "k": 5},
                    "p": {"a": 0, "k": [0, 0]},
                    "r": {"a": 0, "k": 0},
                    "ir": {"a": 0, "k": 10},
                    "or": {"a": 0, "k": 18}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.8, 0.2, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 90,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '🍰', 
      name: 'Cake', 
      value: 15,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 60,
        "w": 100,
        "h": 100,
        "nm": "Cake",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "cake",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 0, "k": 0},
              "p": {"a": 0, "k": [50, 50, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 30, "s": [105, 105, 100]},
                {"t": 60, "s": [100, 100, 100]}
              ]}
            },
            "ao": 0,
            "shapes": [
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "rc",
                    "d": 1,
                    "s": {"a": 0, "k": [25, 15]},
                    "p": {"a": 0, "k": [0, 0]},
                    "r": {"a": 0, "k": 3}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [0.9, 0.7, 0.4, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 60,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '🎈', 
      name: 'Balloon', 
      value: 3,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 120,
        "w": 100,
        "h": 100,
        "nm": "Balloon",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "balloon",
            "sr": 1,
            "ks": {
              "o": {"a": 0, "k": 100},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 60, "s": [10]},
                {"t": 120, "s": [0]}
              ]},
              "p": {"a": 1, "k": [
                {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [50, 50, 0]},
                {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 60, "s": [50, 45, 0]},
                {"t": 120, "s": [50, 50, 0]}
              ]},
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
                    "s": {"a": 0, "k": [20, 25]},
                    "p": {"a": 0, "k": [0, 0]}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.3, 0.3, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 120,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '⭐', 
      name: 'Star', 
      value: 20,
      lottie: {
        "v": "5.7.4",
        "fr": 60,
        "ip": 0,
        "op": 180,
        "w": 100,
        "h": 100,
        "nm": "Star",
        "ddd": 0,
        "assets": [],
        "layers": [
          {
            "ddd": 0,
            "ind": 1,
            "ty": 4,
            "nm": "star",
            "sr": 1,
            "ks": {
              "o": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [100]},
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 90, "s": [80]},
                {"t": 180, "s": [100]}
              ]},
              "r": {"a": 1, "k": [
                {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                {"t": 180, "s": [360]}
              ]},
              "p": {"a": 0, "k": [50, 50, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 90, "s": [120, 120, 100]},
                {"t": 180, "s": [100, 100, 100]}
              ]}
            },
            "ao": 0,
            "shapes": [
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "sr",
                    "sy": 1,
                    "d": 1,
                    "pt": {"a": 0, "k": 5},
                    "p": {"a": 0, "k": [0, 0]},
                    "r": {"a": 0, "k": 0},
                    "ir": {"a": 0, "k": 8},
                    "or": {"a": 0, "k": 15}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.9, 0.2, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 180,
            "st": 0
          }
        ]
      }
    },
    { 
      emoji: '💝', 
      name: 'Heart Gift', 
      value: 25,
      lottie: {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 90,
        "w": 100,
        "h": 100,
        "nm": "Heart Gift",
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
              "o": {"a": 0, "k": 100},
              "r": {"a": 0, "k": 0},
              "p": {"a": 0, "k": [50, 50, 0]},
              "a": {"a": 0, "k": [0, 0, 0]},
              "s": {"a": 1, "k": [
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 30, "s": [110, 110, 100]},
                {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 60, "s": [100, 100, 100]},
                {"t": 90, "s": [110, 110, 100]}
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
                    "s": {"a": 0, "k": [12, 12]},
                    "p": {"a": 0, "k": [-6, -3]}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.2, 0.4, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              },
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "el",
                    "d": 1,
                    "s": {"a": 0, "k": [12, 12]},
                    "p": {"a": 0, "k": [6, -3]}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.2, 0.4, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              },
              {
                "ty": "gr",
                "it": [
                  {
                    "ty": "sr",
                    "sy": 1,
                    "d": 1,
                    "pt": {"a": 0, "k": 3},
                    "p": {"a": 0, "k": [0, 5]},
                    "r": {"a": 0, "k": 180},
                    "ir": {"a": 0, "k": 5},
                    "or": {"a": 0, "k": 12}
                  },
                  {
                    "ty": "fl",
                    "c": {"a": 0, "k": [1, 0.2, 0.4, 1]},
                    "o": {"a": 0, "k": 100}
                  },
                  {
                    "ty": "tr",
                    "p": {"a": 0, "k": [0, 0]},
                    "a": {"a": 0, "k": [0, 0]},
                    "s": {"a": 0, "k": [100, 100]},
                    "r": {"a": 0, "k": 0},
                    "o": {"a": 0, "k": 100}
                  }
                ]
              }
            ],
            "ip": 0,
            "op": 90,
            "st": 0
          }
        ]
      }
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3 flex-shrink-0 sticky top-0 z-10">
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
                  {message.messageType === 'gift' && message.giftData ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-16 h-16">
                        <Lottie
                          loop
                          animationData={message.giftData.lottie}
                          play
                          style={{ width: 64, height: 64 }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold">{message.giftData.name}</p>
                        <p className="text-xs opacity-80">{message.giftData.value} coins</p>
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
