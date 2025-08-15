import { useState, useEffect, useRef, useCallback } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Settings,
  Hash,
  UserMinus,
  X,
  Shield,
  MessageCircle,
  Eye,
  Flag,
  User,
  Crown,
  LogOut,
  EyeOff,
  Info,
  Ban
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatRoomProps {
  roomId?: string;
  roomName?: string;
  onUserClick: (profile: any) => void;
  onLeaveRoom?: () => void;
  savedMessages?: any[];
  onSaveMessages?: (messages: any[]) => void;
  isUserListOpen?: boolean;
  onSetUserListOpen?: (open: boolean) => void;
  isSettingsOpen?: boolean;
  onSetSettingsOpen?: (open: boolean) => void;
  isDarkMode?: boolean;
}

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
  messageType?: string;
  cardImage?: string; // Added for LowCard game
}

interface RoomMember {
  user: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
    isMerchant?: boolean;
    merchantRegisteredAt?: string;
    lastRechargeAt?: string;
    isMentor?: boolean; // Added isMentor property
  };
  role?: string;
}

export function ChatRoom({
  roomId,
  roomName,
  onUserClick,
  onLeaveRoom,
  savedMessages = [],
  onSaveMessages,
  isUserListOpen = false,
  onSetUserListOpen,
  isSettingsOpen = false,
  onSetSettingsOpen,
  isDarkMode = false
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localUserListOpen, setLocalUserListOpen] = useState(false);
  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);
  const [memberListError, setMemberListError] = useState(false);


  // Use props if provided, otherwise fall back to local state
  const userListOpen = onSetUserListOpen ? isUserListOpen : localUserListOpen;
  const settingsOpen = onSetSettingsOpen ? isSettingsOpen : localSettingsOpen;
  const setUserListOpen = onSetUserListOpen || setLocalUserListOpen;
  const setSettingsOpen = onSetSettingsOpen || setLocalSettingsOpen;
  const [voteKicks, setVoteKicks] = useState<Map<string, Set<string>>>(new Map()); // userId -> Set of voter IDs
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const { sendChatMessage, joinRoom, isConnected, leaveRoom, socket } = useWebSocket(); // Added socket to destructure
  const { user } = useAuth();

  // State for active kick votes and their timers
  const [activeKickVotes, setActiveKickVotes] = useState<{ [key: string]: { voters: Set<string>; remainingTime: number; targetUser: any } }>({});
  const kickVoteDuration = 60; // seconds

  // Room members data
  const { data: roomMembers, refetch: refetchMembers, isLoading: isLoadingMembers } = useQuery<RoomMember[]>({
    queryKey: ["/api/rooms", roomId, "members"],
    enabled: Boolean(roomId),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 3,
    refetchOnWindowFocus: false
  });

  // Check for temporary ban when trying to access room
  const checkTempBan = async (roomId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/check-access`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes('kicked')) {
          // Extract remaining time from the message
          const timeMatch = errorData.message.match(/(\d+) more minutes?/);
          const remainingMinutes = timeMatch ? parseInt(timeMatch[1]) : 0;

          // Show popup with remaining time
          const banPopupMessage = `🚫 YOU HAVE BEEN KICKED!\n\nYou cannot enter any chat rooms right now.\n\nTime remaining: ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}\n\nPlease wait until the restriction is lifted.`;

          alert(banPopupMessage);

          // Navigate away from room
          if (onLeaveRoom) {
            onLeaveRoom();
          }
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking room access:', error);
      return true; // Allow access if check fails
    }
  };

  // Track if room is already joined to prevent multiple joins/leaves
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const previousRoomIdRef = useRef<string | null>(null);
  const joinAttemptRef = useRef<boolean>(false);

  // Function to load messages - defined with useCallback to make it accessible
  const loadRoomMessages = useCallback(async () => {
    if (!roomId || !roomName) return;
    
    console.log('Loading messages for joined room:', roomId);

    const MESSAGE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Try to restore messages from localStorage for this room using consistent key format
    const localStorageKeys = [`chat_${roomId}`, `chatMessages-${roomId}`];
    let storedData = null;

    for (const key of localStorageKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        storedData = stored;
        break;
      }
    }

    let shouldShowWelcome = false;

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);

        // Check if this is old format (array) or new format (object with timestamp)
        if (Array.isArray(parsedData)) {
          console.log('Found old format messages, clearing and showing welcome messages');
          // Old format - clear and show welcome messages
          localStorage.removeItem(`chat_${roomId}`);
          shouldShowWelcome = true;
        } else if (parsedData.messages && parsedData.savedAt) {
          // New format with timestamp - check if expired
          const messageAge = Date.now() - parsedData.savedAt;

          if (messageAge > MESSAGE_EXPIRY_TIME) {
            console.log('Messages expired (', Math.round(messageAge / 1000 / 60), 'minutes old), showing welcome messages only');
            localStorage.removeItem(`chat_${roomId}`);
            shouldShowWelcome = true;
          } else {
            console.log('Restoring valid messages from localStorage for room:', roomId, parsedData.messages.length);

            // Check if welcome messages exist in stored messages
            const hasWelcomeMessage = parsedData.messages.some(msg =>
              msg.id === `welcome-${roomId}` || msg.content.includes(`Welcome to ${roomName}`)
            );
            const hasManagedByMessage = parsedData.messages.some(msg =>
              msg.id === `room-managed-${roomId}` || msg.content.includes('managed by')
            );

            // If welcome messages are missing, we need to regenerate them
            if (!hasWelcomeMessage || !hasManagedByMessage) {
              shouldShowWelcome = true;
            } else {
              setMessages(parsedData.messages);
              return; // Exit early if messages loaded successfully
            }
          }
        } else {
          // Invalid format
          console.log('Invalid message format, clearing and showing welcome messages');
          localStorage.removeItem(`chat_${roomId}`);
          shouldShowWelcome = true;
        }
      } catch (error) {
        console.error('Failed to parse stored messages for room:', roomId, error);
        localStorage.removeItem(`chat_${roomId}`);
        shouldShowWelcome = true;
      }
    } else if (savedMessages.length > 0) {
      console.log('Restoring saved messages for room:', roomId, savedMessages.length);

      // Check if welcome messages exist in saved messages
      const hasWelcomeMessage = savedMessages.some(msg =>
        msg.id === `welcome-${roomId}` || msg.content.includes(`Welcome to ${roomName}`)
      );
      const hasManagedByMessage = savedMessages.some(msg =>
        msg.id === `room-managed-${roomId}` || msg.content.includes('managed by')
      );

      if (!hasWelcomeMessage || !hasManagedByMessage) {
        shouldShowWelcome = true;
      } else {
        setMessages(savedMessages);
        // Save to consistent localStorage key with timestamp
        const messagesWithTimestamp = {
          messages: savedMessages,
          savedAt: Date.now(),
          roomId: roomId
        };
        localStorage.setItem(`chat_${roomId}`, JSON.stringify(messagesWithTimestamp));
        return; // Exit early if messages loaded successfully
      }
    } else {
      shouldShowWelcome = true;
    }

    // Generate welcome messages if needed
    if (shouldShowWelcome) {
      // Generate welcome messages
      const welcomeMessages = [
        {
          id: `welcome-${roomId}`,
          content: `Welcome to ${roomName} official chat room.`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        }
      ];

      // Add current user join message
      if (user && user.username) {
        welcomeMessages.push({
          id: `current-user-${roomId}`,
          content: `Currently user in the room: ${user.username}[${user.level || 1}]`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        });
      }

      // For non-system rooms (not rooms 1-4), fetch room info to show creator
      if (!['1', '2', '3', '4'].includes(roomId)) {
        try {
          const response = await fetch(`/api/rooms/${roomId}/info`);
          if (response.ok) {
            const roomData = await response.json();
            console.log('Room data received:', roomData);
            const creatorName = roomData.createdBy || 'Unknown';
            welcomeMessages.push({
              id: `room-managed-${roomId}`,
              content: `This room is managed by ${creatorName}`,
              senderId: 'system',
              createdAt: new Date().toISOString(),
              sender: { id: 'system', username: 'System', level: 0, isOnline: true },
              messageType: 'system'
            });
          } else {
            welcomeMessages.push({
              id: `room-managed-${roomId}`,
              content: `This room is managed by room creator`,
              senderId: 'system',
              createdAt: new Date().toISOString(),
              sender: { id: 'system', username: 'System', level: 0, isOnline: true },
              messageType: 'system'
            });
          }
        } catch (error) {
          console.error('Failed to fetch room creator info:', error);
          welcomeMessages.push({
            id: `room-managed-${roomId}`,
            content: `This room is managed by room creator`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          });
        }
      } else {
        // For system rooms, show system as manager
        welcomeMessages.push({
          id: `room-managed-${roomId}`,
          content: `This room is managed by System`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        });
      }

      // Merge with existing messages if any (excluding old welcome messages)
      let existingMessages = [];
      if (storedData) {
        try {
          const parsedMessages = JSON.parse(storedData);
          if (Array.isArray(parsedMessages)) {
            existingMessages = parsedMessages.filter(msg =>
              !msg.id?.startsWith('welcome-') &&
              !msg.id?.startsWith('room-managed-') &&
              !msg.id?.startsWith('current-user-') &&
              !msg.content?.includes(`Welcome to ${roomName}`) &&
              !msg.content?.includes('managed by') &&
              !msg.content?.includes('Currently user in the room')
            );
          } else if (parsedMessages.messages) {
            existingMessages = parsedMessages.messages.filter(msg =>
              !msg.id?.startsWith('welcome-') &&
              !msg.id?.startsWith('room-managed-') &&
              !msg.id?.startsWith('current-user-') &&
              !msg.content?.includes(`Welcome to ${roomName}`) &&
              !msg.content?.includes('managed by') &&
              !msg.content?.includes('Currently user in the room')
            );
          }
        } catch (error) {
          console.error('Error parsing stored messages:', error);
        }
      } else if (savedMessages.length > 0) {
        existingMessages = savedMessages.filter(msg =>
          !msg.id?.startsWith('welcome-') &&
          !msg.id?.startsWith('room-managed-') &&
          !msg.id?.startsWith('current-user-') &&
          !msg.content?.includes(`Welcome to ${roomName}`) &&
          !msg.content?.includes('managed by') &&
          !msg.content?.includes('Currently user in the room')
        );
      }

      const finalMessages = [...welcomeMessages, ...existingMessages];
      console.log('Setting welcome messages for room:', roomId, finalMessages);
      setMessages(finalMessages);

      // Save updated messages to consistent localStorage key with timestamp
      const messagesWithTimestamp = {
        messages: finalMessages,
        savedAt: Date.now(),
        roomId: roomId
      };
      localStorage.setItem(`chat_${roomId}`, JSON.stringify(messagesWithTimestamp));
      console.log('Generated and saved welcome messages with timestamp for room:', roomId);

      // Force scroll to bottom multiple times to ensure it works
      const scrollToBottom = () => {
        const messagesContainer = document.querySelector('.chat-room-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          console.log('Scrolled to bottom:', messagesContainer.scrollHeight);
        }
      };

      // Multiple scroll attempts with different delays
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
      setTimeout(scrollToBottom, 1000);
    }
  }, [roomId, roomName, savedMessages, user]);

  // Initialize room and messages
  useEffect(() => {
    const initializeRoom = async () => {
      console.log('ChatRoom useEffect:', { isConnected, roomId, roomName, savedMessagesCount: savedMessages.length });

      if (!roomId || !roomName) {
        console.warn('ChatRoom not initialized - missing roomId or roomName:', { roomId, roomName });
        setMessages([]); // Clear messages if room is invalid
        return;
      }

      console.log('Initializing chat room:', roomId);

      // Join room logic first - only if connected and not already joined/attempting
      if (isConnected && !isRoomJoined && !joinAttemptRef.current) {
        joinAttemptRef.current = true;

        try {
          const canJoin = await checkTempBan(roomId);
          if (canJoin) {
            console.log('Attempting to join room:', roomId);
            joinRoom(roomId);
            setIsRoomJoined(true);
            console.log('Successfully joined room:', roomId);

            // Only load messages AFTER successfully joining the room
            loadRoomMessages();
          }
        } catch (error) {
          console.error('Error checking temp ban or joining room:', error);
          // Still try to join if check fails
          try {
            joinRoom(roomId);
            setIsRoomJoined(true);
            console.log('Joined room after error recovery:', roomId);

            // Load messages after successful recovery join
            loadRoomMessages();
          } catch (joinError) {
            console.error('Failed to join room:', joinError);
          }
        } finally {
          joinAttemptRef.current = false;
        }
      } else if (isRoomJoined) {
        // User is already joined, load messages
        loadRoomMessages();
      }

      previousRoomIdRef.current = roomId;
    };
      

    // Reset join attempt flag when room changes
    if (previousRoomIdRef.current !== roomId) {
      joinAttemptRef.current = false;
      setIsRoomJoined(false);
    }

    initializeRoom().catch(console.error);

    // Cleanup when roomId changes - preserve connection and input state
    return () => {
      console.log('Cleaning up chat room for UI switch:', roomId);

      // Close modals when switching tabs
      setUserListOpen(false);
      setSettingsOpen(false);

      // CRITICAL: NEVER call leaveRoom here - this would cause "left room" messages
      // Room connections are managed by localStorage and should persist across tab switches
      // Only explicit user action (clicking Leave Room button) should trigger actual room leave
      console.log('ChatRoom cleanup completed - WebSocket connection preserved');
    };
  }, [roomId, roomName, isConnected, joinRoom, savedMessages.length, loadRoomMessages]);

  // Effect to handle room switching - preserve connection and only reset if completely different room
  useEffect(() => {
    if (previousRoomIdRef.current && previousRoomIdRef.current !== roomId) {
      console.log('Room changed from', previousRoomIdRef.current, 'to', roomId, '- preserving connection and preventing leave');

      // CRITICAL: Never leave the previous room when switching tabs
      // Multi-room tabs should maintain all connections simultaneously
      // Only reset join status if this is a completely new room that wasn't previously connected
      const wasAlreadyConnected = isRoomJoined;
      if (!wasAlreadyConnected) {
        setIsRoomJoined(false);
        joinAttemptRef.current = false;
      }

      // Save current room messages before switch (handled by parent component)
      if (previousRoomIdRef.current && messages.length > 0 && onSaveMessages) {
        console.log('Auto-saving messages for room switch:', previousRoomIdRef.current);
        onSaveMessages(messages);
      }

      // Clear UI state when switching rooms
      setUserListOpen(false);
      setSettingsOpen(false);
    }
  }, [roomId, isRoomJoined, messages, onSaveMessages]);

  // Timer effect for kick votes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveKickVotes(prevVotes => {
        const updatedVotes = { ...prevVotes };
        let changed = false;
        for (const userId in updatedVotes) {
          updatedVotes[userId].remainingTime--;
          if (updatedVotes[userId].remainingTime <= 0) {
            // Vote expired
            const kickMessage = {
              id: `kick-fail-${Date.now()}-${updatedVotes[userId].targetUser.username}`,
              content: `A kick vote for ${updatedVotes[userId].targetUser.username} has failed (timed out).`,
              senderId: 'system',
              createdAt: new Date().toISOString(),
              sender: { id: 'system', username: 'System', level: 0, isOnline: true },
              messageType: 'system'
            };
            setMessages(prev => [...prev, kickMessage]);
            delete updatedVotes[userId];
            changed = true;
          } else {
            // Update remaining time text
            if (updatedVotes[userId].remainingTime === 20 || updatedVotes[userId].remainingTime === 10 || updatedVotes[userId].remainingTime === 5) {
              const timerMessage = {
                id: `kick-timer-${Date.now()}-${userId}`,
                content: `${updatedVotes[userId].remainingTime}s remaining`,
                senderId: 'system',
                createdAt: new Date().toISOString(),
                sender: { id: 'system', username: 'System', level: 0, isOnline: true },
                messageType: 'system'
              };
              setMessages(prev => [...prev, timerMessage]);
            }
          }
        }
        return changed ? updatedVotes : prevVotes;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [setMessages]); // Include setMessages in dependency array

  // Note: Removed the "Currently in the room" message to avoid chat spam when users join

  // Auto-save messages to localStorage with timestamps whenever messages change (only if user has joined)
  useEffect(() => {
    if (roomId && messages.length > 0 && isRoomJoined) {
      const localStorageKey = `chat_${roomId}`;
      const messagesWithTimestamp = {
        messages: messages,
        savedAt: Date.now(),
        roomId: roomId
      };
      localStorage.setItem(localStorageKey, JSON.stringify(messagesWithTimestamp));
      console.log('Auto-saved', messages.length, 'messages with timestamp to localStorage for room:', roomId);
    }
  }, [messages, roomId, isRoomJoined]);

  // Auto-clear expired messages every 30 seconds
  useEffect(() => {
    const MESSAGE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

    const clearExpiredMessages = () => {
      if (!roomId || !isRoomJoined) return;

      const localStorageKey = `chat_${roomId}`;
      const storedData = localStorage.getItem(localStorageKey);

      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);

          // Check if this is old format (array) or new format (object with timestamp)
          if (Array.isArray(parsedData)) {
            // Old format - clear immediately as we can't determine age
            console.log('Clearing old format messages for room:', roomId);
            localStorage.removeItem(localStorageKey);
            setMessages([]);
            return;
          }

          // New format with timestamp
          if (parsedData.savedAt && parsedData.messages) {
            const messageAge = Date.now() - parsedData.savedAt;

            if (messageAge > MESSAGE_EXPIRY_TIME) {
              console.log('Clearing expired messages for room:', roomId, 'Age:', Math.round(messageAge / 1000 / 60), 'minutes');
              localStorage.removeItem(localStorageKey);

              // Clear messages and show only welcome messages
              const welcomeMessages = [
                {
                  id: `welcome-${roomId}`,
                  content: `Welcome to ${roomName} official chat room.`,
                  senderId: 'system',
                  createdAt: new Date().toISOString(),
                  sender: { id: 'system', username: 'System', level: 0, isOnline: true },
                  messageType: 'system'
                }
              ];

              // Add room managed by message for non-system rooms
              if (!['1', '2', '3', '4'].includes(roomId)) {
                welcomeMessages.push({
                  id: `room-managed-${roomId}`,
                  content: `This room is managed by room creator`,
                  senderId: 'system',
                  createdAt: new Date().toISOString(),
                  sender: { id: 'system', username: 'System', level: 0, isOnline: true },
                  messageType: 'system'
                });
              }

              setMessages(welcomeMessages);

              // Save the new welcome messages with timestamp
              const newMessagesWithTimestamp = {
                messages: welcomeMessages,
                savedAt: Date.now(),
                roomId: roomId
              };
              localStorage.setItem(localStorageKey, JSON.stringify(newMessagesWithTimestamp));
            }
          }
        } catch (error) {
          console.error('Error checking message expiry:', error);
          // If there's an error parsing, clear the corrupted data
          localStorage.removeItem(localStorageKey);
        }
      }
    };

    // Clear expired messages immediately on component mount
    clearExpiredMessages();

    // Set up interval to check for expired messages every 30 seconds
    const interval = setInterval(clearExpiredMessages, 30000);

    return () => clearInterval(interval);
  }, [roomId, roomName, isRoomJoined]);

  // Missing event handlers
  const handleUserTyping = (event: CustomEvent) => {
    // Handle user typing event
    console.log('User typing:', event.detail);
  };

  const handleBotMessage = (event: CustomEvent) => {
    // Handle bot message event
    const botMessage = event.detail;
    if (botMessage.roomId === roomId) {
      setMessages(prev => [...prev, botMessage]);
    }
  };

  // WebSocket event listeners
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      console.log('ChatRoom: Received new message event:', newMessage);

      // Ensure we have required fields
      if (!newMessage || !newMessage.content) {
        console.error('ChatRoom: Invalid message data received:', newMessage);
        return;
      }

      // Check if this message is for the current room
      if (newMessage.roomId === roomId) {
        // Don't show messages from blocked users
        if (blockedUsers.has(newMessage.senderId)) {
          return;
        }

        // Check if message already exists (prevent duplicates)
        setMessages(prev => {
          // Remove any temporary optimistic messages with same content from same user
          const filteredPrev = prev.filter(msg => {
            if (msg.id.startsWith('temp-') && 
                msg.senderId === newMessage.senderId && 
                msg.content === newMessage.content) {
              return false; // Remove optimistic message
            }
            return true;
          });

          const messageExists = filteredPrev.some(msg =>
            msg.id === newMessage.id ||
            (msg.senderId === newMessage.senderId &&
             msg.content === newMessage.content &&
             Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 2000)
          );

          if (messageExists) {
            console.log('Message already exists, skipping:', newMessage.id);
            return filteredPrev;
          }

          // Ensure message has required structure for display
          const messageToAdd = {
            id: newMessage.id || `msg-${Date.now()}-${Math.random()}`,
            content: newMessage.content,
            senderId: newMessage.senderId,
            createdAt: newMessage.createdAt || new Date().toISOString(),
            sender: newMessage.sender || {
              id: newMessage.senderId,
              username: 'User',
              level: 1,
              isOnline: true
            },
            messageType: newMessage.messageType || 'text',
            cardImage: newMessage.cardImage,
            roomId: newMessage.roomId,
            metadata: newMessage.metadata
          };

          console.log('Adding new message to chat:', messageToAdd.id);
          const newMessages = [...filteredPrev, messageToAdd];

          // Auto-scroll to bottom immediately - no delay
          requestAnimationFrame(() => {
            const messagesContainer = document.querySelector('.chat-room-messages');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          });

          return newMessages;
        });
      }
    };

    const handleSocketError = (event: CustomEvent) => {
      const { message } = event.detail;

      // Show error message in chat for any socket error
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: `❌ ${message || 'An error occurred'}`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, errorMessage]);
    };

    const handleRoomLeft = (event: CustomEvent) => {
      const { roomId: leftRoomId, success } = event.detail;
      if (leftRoomId === roomId && success) {
        console.log('Successfully left room:', leftRoomId);
        setIsRoomJoined(false);
        joinAttemptRef.current = false;
      }
    };

    const handleUserJoin = (event: CustomEvent) => {
      const { username, roomId: eventRoomId, userLevel } = event.detail;
      if (eventRoomId === roomId && username && username !== 'undefined') {
        // Check if we already have a recent join message for this user to prevent duplicates
        const recentJoinMessages = messages.filter(msg =>
          msg.content.includes(`${username} has entered`) &&
          Date.now() - new Date(msg.createdAt).getTime() < 3000 // within 3 seconds
        );

        if (recentJoinMessages.length === 0) {
          const joinMessage = {
            id: `join-${Date.now()}-${username}`,
            content: `${username}[${userLevel || 1}] has entered`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          };
          setMessages(prev => [...prev, joinMessage]);
          console.log('Added join message:', joinMessage);
        }
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleUserLeave = (event: CustomEvent) => {
      const { username, roomId: eventRoomId, userId: leftUserId, userLevel } = event.detail;
      console.log('User leave event received:', { username, eventRoomId, leftUserId, currentRoomId: roomId, userLevel });

      if (eventRoomId === roomId && username && username !== 'undefined') {
        // If current user is leaving, clear everything immediately
        if (leftUserId === user?.id) {
          console.log('Current user is leaving, clearing all room state and localStorage');

          // Clear messages state immediately
          setMessages([]);

          // Clear all localStorage related to this room
          const localStorageKey = `chatMessages-${roomId}`;
          localStorage.removeItem(localStorageKey);

          // Clear saved room states
          const savedRoomStates = JSON.parse(localStorage.getItem('savedRoomStates') || '{}');
          if (savedRoomStates[roomId]) {
            delete savedRoomStates[roomId];
            localStorage.setItem('savedRoomStates', JSON.stringify(savedRoomStates));
          }

          // Clear multi-room state if exists
          if (user) {
            const multiRoomStateKey = `multiRoomState-${user.id}`;
            const multiRoomState = JSON.parse(localStorage.getItem(multiRoomStateKey) || '{}');
            if (multiRoomState.rooms) {
              multiRoomState.rooms = multiRoomState.rooms.filter((room: any) => room.id !== roomId);
              localStorage.setItem(multiRoomStateKey, JSON.stringify(multiRoomState));
            }
          }

          console.log('Cleared all localStorage data for user leaving room:', roomId);
          return;
        }

        // Check if we already have a recent leave message for this user to prevent duplicates
        const recentLeaveMessages = messages.filter(msg =>
          (msg.content.includes(`${username} has left`) || msg.content.includes(`${username} has left the room`)) &&
          Date.now() - new Date(msg.createdAt).getTime() < 3000 // within 3 seconds
        );

        console.log('Recent leave messages found:', recentLeaveMessages.length);

        if (recentLeaveMessages.length === 0) {
          const leaveMessage = {
            id: `leave-${Date.now()}-${username}`,
            content: `${username}[${userLevel || 1}] has left the room`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          };
          console.log('Adding leave message:', leaveMessage);
          setMessages(prev => [...prev, leaveMessage]);
        }

        // Refresh member list after a short delay
        setTimeout(() => refetchMembers(), 500);
      }
    };

    const handleForceMemberRefresh = (event: CustomEvent) => {
      const { roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId) {
        console.log('Force refreshing member list for room:', roomId);
        refetchMembers();
      }
    };

    const handleUserKicked = (event: CustomEvent) => {
      const { username, roomId: eventRoomId, kickedBy } = event.detail;
      if (eventRoomId === roomId) {
        const kickMessage = {
          id: `kick-${Date.now()}-${username}`,
          content: `${username} has been kicked from the room`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickMessage]);
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleForcedLeave = (event: CustomEvent) => {
      const { roomId: eventRoomId, reason } = event.detail;
      if (eventRoomId === roomId) {
        alert(reason);
        if (onLeaveRoom) {
          onLeaveRoom();
        }
      }
    };

    const handleRoomJoined = (event: CustomEvent) => {
      const { roomId: joinedRoomId, success } = event.detail;
      if (joinedRoomId === roomId && success) {
        console.log('Room joined successfully via event:', joinedRoomId);
        setIsRoomJoined(true);
        joinAttemptRef.current = false;

        // Load messages after successful join
        setTimeout(() => {
          loadRoomMessages();
        }, 500);
      } else if (joinedRoomId === roomId && !success) {
        console.error('Failed to join room:', joinedRoomId);
        setIsRoomJoined(false);
        joinAttemptRef.current = false;
      }
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('userJoined', handleUserJoin as EventListener);
    window.addEventListener('userLeft', handleUserLeave as EventListener);
    window.addEventListener('userTyping', handleUserTyping);
    window.addEventListener('botMessage', handleBotMessage);
    window.addEventListener('roomJoined', handleRoomJoined);
    window.addEventListener('roomLeft', handleRoomLeft);
    window.addEventListener('forcedLeaveRoom', handleForcedLeave);
    window.addEventListener('socketError', handleSocketError);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('userJoined', handleUserJoin as EventListener);
      window.removeEventListener('userLeft', handleUserLeave as EventListener);
      window.removeEventListener('userTyping', handleUserTyping);
      window.removeEventListener('botMessage', handleBotMessage);
      window.removeEventListener('roomJoined', handleRoomJoined);
      window.removeEventListener('roomLeft', handleRoomLeft);
      window.removeEventListener('forcedLeaveRoom', handleForcedLeave);
      window.removeEventListener('socketError', handleSocketError);
    };
  }, [roomId, refetchMembers, messages, blockedUsers, user, roomName, isRoomJoined, joinAttemptRef, loadRoomMessages]); // Added roomName and isRoomJoined

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) {
      console.log('Cannot send empty message');
      return;
    }

    if (!isConnected) {
      console.log('Cannot send message: not connected to server');
      // Show error message to user
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: '❌ Connection lost. Please reconnect to send messages.',
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'system',
          username: 'System',
          level: 0,
          isOnline: true
        },
        messageType: 'system'
      }]);
      return;
    }

    if (!roomId) {
      console.log('Cannot send message: no room ID');
      return;
    }

    if (!user) {
      console.log('Cannot send message: no user data');
      return;
    }

    console.log('ChatRoom: Sending message:', content, 'to room:', roomId);

    try {
      // Create optimistic message to show immediately
      const optimisticMessage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        content: content.trim(),
        senderId: user.id,
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          username: user.username || 'You',
          level: user.level || 1,
          isOnline: true,
          profilePhotoUrl: user.profilePhotoUrl,
          isMentor: user.isMentor,
          isMerchant: user.isMerchant
        },
        messageType: 'text',
        roomId: roomId
      };

      // Add message immediately to local state for instant feedback
      setMessages(prev => [...prev, optimisticMessage]);

      // Send message via WebSocket
      sendChatMessage(content, roomId);
      console.log('Message sent successfully via WebSocket');

      // Auto-scroll to bottom immediately
      requestAnimationFrame(() => {
        const messagesContainer = document.querySelector('.chat-room-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message to user
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: '❌ Failed to send message. Please try again.',
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'system',
          username: 'System',
          level: 0,
          isOnline: true
        },
        messageType: 'system'
      }]);
    }
  }, [roomId, isConnected, sendChatMessage, user]);


  const handleChatUser = (user: any) => {
    console.log('Opening private chat with:', user.username);
    // Create a custom event to switch to DM tab and open chat
    const dmProfile = {
      id: user.id,
      username: user.username,
      level: user.level,
      status: user.status || "Available for chat",
      isOnline: user.isOnline,
      profilePhotoUrl: user.profilePhotoUrl,
      country: user.country || 'ID',
      bio: user.bio || '',
    };

    // Dispatch custom event to handle DM opening
    window.dispatchEvent(new CustomEvent('openDirectMessage', {
      detail: dmProfile
    }));
  };

  const handleViewProfile = (user: any) => {
    // Open mini profile modal
    console.log('Opening mini profile for:', user.username);
    const profileData = {
      id: user.id,
      username: user.username,
      level: user.level,
      status: user.status || "",
      bio: user.bio || '',
      isOnline: user.isOnline || false,
      country: user.country || 'ID',
      profilePhotoUrl: user.profilePhotoUrl,
      fansCount: user.fansCount || 0,
      followingCount: user.followingCount || 0,
      isFriend: false, // You might want to check actual friend status
      isAdmin: (user.level || 0) >= 5,
    };

    // Trigger the view profile event that the parent component can listen to
    window.dispatchEvent(new CustomEvent('showMiniProfile', {
      detail: profileData
    }));
  };

  const handleUserInfo = (username: string) => {
    // Send enhanced whois command with room context
    if (roomId) {
      // Send whois command that will show user info in room context
      sendChatMessage(`/whois ${username}`, roomId);

      // Also show room-specific information
      const roomInfoMessage = {
        id: `room-info-${Date.now()}`,
        content: `🏠 Room: ${roomName} | 👥 Members: ${roomMembers?.length || 0}/25 | 🎯 Viewing info for: ${username}`,
        senderId: 'system',
        roomId: roomId,
        recipientId: null,
        messageType: 'system',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'system',
          username: 'System',
          level: 0,
          isOnline: true,
        }
      };

      // Dispatch event to show room info message
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: roomInfoMessage
      }));
    }
  };

  // Listen for whois commands from message list
  useEffect(() => {
    const handleWhoisCommand = (event: CustomEvent) => {
      const { content, roomId: commandRoomId } = event.detail;
      if (commandRoomId === roomId || !commandRoomId) {
        sendChatMessage(content, roomId);
      }
    };

    window.addEventListener('sendWhoisCommand', handleWhoisCommand as EventListener);

    return () => {
      window.removeEventListener('sendWhoisCommand', handleWhoisCommand as EventListener);
    };
  }, [roomId, sendChatMessage]);

  // Kick command handler
  const handleKickCommand = async (targetUsername: string) => { // Added async keyword
    const targetUser = roomMembers?.find(member => member.user.username.toLowerCase() === targetUsername.toLowerCase())?.user;

    if (!targetUser) {
      const systemMessage = {
        id: `kick-error-${Date.now()}`,
        content: `User "${targetUsername}" not found in this room.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    if (targetUser.id === user?.id) {
      const systemMessage = {
        id: `kick-error-${Date.now()}`,
        content: `You cannot kick yourself.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    // Prevent kicking admin users
    if ((targetUser.level || 0) >= 5) {
      const errorMessage = {
        id: `kick-error-${Date.now()}`,
        content: `❌ Cannot kick admin users.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }


    // Check if a kick vote is already active for this user
    if (activeKickVotes[targetUser.id]) {
      const systemMessage = {
        id: `kick-info-${Date.now()}`,
        content: `A kick vote for ${targetUsername} is already in progress.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    // Start a new kick vote
    const newKickVote = {
      voters: new Set<string>([user!.id]),
      remainingTime: kickVoteDuration,
      targetUser: targetUser,
    };

    setActiveKickVotes(prev => ({
      ...prev,
      [targetUser.id]: newKickVote,
    }));

    const voteStartMessage = {
      id: `kick-start-${Date.now()}-${targetUser.id}`,
      content: `A vote to kick ${targetUsername} has been started by ${user!.username}. ${Math.ceil((roomMembers?.length || 1) / 2)} more votes needed. ${kickVoteDuration}s remaining`,
      senderId: 'system',
      createdAt: new Date().toISOString(),
      sender: { id: 'system', username: 'System', level: 0, isOnline: true },
      messageType: 'system'
    };
    setMessages(prev => [...prev, voteStartMessage]);
  };


  const handleVoteKick = async (targetUserId: string) => {
    if (!user?.id || !roomId) return;

    try {
      const activeVote = activeKickVotes[targetUserId];
      if (!activeVote) return; // No active vote

      if (activeVote.voters.has(user.id)) {
        // Remove vote
        activeVote.voters.delete(user.id);
        const voteRemovedMessage = {
          id: `vote-removed-${Date.now()}`,
          content: `${user.username} removed their kick vote for ${activeVote.targetUser.username}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, voteRemovedMessage]);
      } else {
        // Add vote
        activeVote.voters.add(user.id);
        const voteAddedMessage = {
          id: `vote-kick-${Date.now()}`,
          content: `${user.username} voted to kick ${activeVote.targetUser.username} (${activeVote.voters.size}/${Math.ceil((roomMembers?.length || 1) / 2)} votes needed)`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, voteAddedMessage]);
      }

      // Update vote state
      const newActiveKickVotes = { ...activeKickVotes, [targetUserId]: activeVote };
      setActiveKickVotes(newActiveKickVotes);

      // Check if enough votes to kick (majority)
      const requiredVotes = Math.ceil((roomMembers?.length || 1) / 2);
      if (activeVote.voters.size >= requiredVotes) {
        // Execute kick
        await handleKickUser(activeVote.targetUser.id, activeVote.targetUser.username);
        // Clean up the active vote
        const { [targetUserId]: _, ...rest } = newActiveKickVotes;
        setActiveKickVotes(rest);
      }

    } catch (error) {
      console.error('Failed to vote kick:', error);
    }
  };

  const handleReportUser = async (targetUser: any) => {
    try {
      const reportMessage = `🚨 REPORT: User ${user?.username} reported ${targetUser.username} in room ${roomName} (${roomId}). Please investigate.`;

      // Send report to admin chat (assuming admin room ID is 'admin' or '1')
      const response = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUser.id,
          reportedUsername: targetUser.username,
          reporterUserId: user?.id,
          reporterUsername: user?.username,
          roomId: roomId,
          roomName: roomName,
          message: reportMessage
        })
      });

      if (response.ok) {
        const confirmMessage = {
          id: `report-${Date.now()}`,
          content: `Report sent to administrators for ${targetUser.username}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, confirmMessage]);
      }
    } catch (error) {
      console.error('Failed to report user:', error);
    }
  };

  const handleRoomInfo = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/info`);
      if (response.ok) {
        const roomData = await response.json();
        // setRoomInfo(roomData); // Removed as roomInfo state is removed

        const infoMessage = {
          id: `room-info-${Date.now()}`,
          content: `🏠 Room: ${roomData.name} | 👤 Managed by: ${roomData.createdBy || 'System'} | 📅 Created: ${new Date(roomData.createdAt).toLocaleDateString()} | 👥 Members: ${roomMembers?.length || 0}/${roomData.capacity || 25}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, infoMessage]);
      }
    } catch (error) {
      console.error('Failed to get room info:', error);
    }
  };

  const handleBlockUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`/api/admin/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Show success message
        const blockMessage = {
          id: `block-${Date.now()}`,
          content: `${username} has been blocked from all chat rooms`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, blockMessage]);
        setTimeout(() => refetchMembers(), 100); // Refresh members after block
      } else {
        const errorMessage = await response.json();
        const blockFailMessage = {
          id: `block-fail-${Date.now()}`,
          content: `Failed to block ${username}: ${errorMessage.message || 'Unknown error'}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, blockFailMessage]);
      }
    } catch (error) {
      console.error('Failed to block user:', error);
      const blockFailMessage = {
        id: `block-fail-${Date.now()}`,
        content: `An error occurred while trying to block ${username}.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, blockFailMessage]);
    }
  };

  const handleKickUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Show success message
        const kickMessage = {
          id: `kick-${Date.now()}`,
          content: `${username} has been kicked from the room`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickMessage]);
        setTimeout(() => refetchMembers(), 100); // Refresh members after kick
      } else {
        const errorMessage = await response.json();
        const kickFailMessage = {
          id: `kick-fail-${Date.now()}`,
          content: `Failed to kick ${username}: ${errorMessage.message || 'Unknown error'}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickFailMessage]);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
      const kickFailMessage = {
        id: `kick-fail-${Date.now()}`,
        content: `An error occurred while trying to kick ${username}.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, kickFailMessage]);
    }
  };

  const handleLeaveRoom = () => {
    // Show confirmation before leaving
    const confirmLeave = window.confirm(`Are you sure you want to leave ${roomName}?`);
    if (confirmLeave) {
      // Clear ALL localStorage cache for this room when explicitly leaving
      if (roomId) {
        // Clear main chat messages with specific key format (both old and new formats)
        localStorage.removeItem(`chat_${roomId}`);
        localStorage.removeItem(`chatMessages-${roomId}`);

        // Clear saved room states
        const savedRoomStates = JSON.parse(localStorage.getItem('savedRoomStates') || '{}');
        if (savedRoomStates[roomId]) {
          delete savedRoomStates[roomId];
          localStorage.setItem('savedRoomStates', JSON.stringify(savedRoomStates));
        }

        // Clear multi-room state
        if (user) {
          const multiRoomStateKey = `multiRoomState-${user.id}`;
          const multiRoomState = JSON.parse(localStorage.getItem(multiRoomStateKey) || '{}');
          if (multiRoomState.rooms) {
            multiRoomState.rooms = multiRoomState.rooms.filter((room: any) => room.id !== roomId);
            localStorage.setItem(multiRoomStateKey, JSON.stringify(multiRoomState));
          }
        }

        // Clear any additional room-specific keys that might exist
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.includes(roomId) || key.includes(`chat_${roomId}`) || key.includes(`room_${roomId}`)) {
            localStorage.removeItem(key);
            console.log('Removed localStorage key:', key);
          }
        });

        console.log('Cleared ALL localStorage cache for room:', roomId);

        // Clear room-specific state immediately
        setMessages([]);
        setIsRoomJoined(false);
        setUserListOpen(false);
        setSettingsOpen(false);

        // Clear any cached room data from query client
        try {
          const { queryClient } = require('@/lib/queryClient');
          queryClient.removeQueries({ queryKey: ["/api/rooms", roomId] });
          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
        } catch (error) {
          console.log('Query client not available, skipping cache clear');
        }

        // Actually leave the room via WebSocket with forceLeave=true
        leaveRoom(roomId, true); // Force leave the room
        console.log('User explicitly left room:', roomId);

        // Navigate back to room list immediately without page refresh
        if (onLeaveRoom) {
          onLeaveRoom();
        }
      } else {
        if (onLeaveRoom) {
          onLeaveRoom();
        }
      }
    }
  };

  const handleBackToRoomList = () => {
    // Navigate back to room list without leaving room or disconnecting WebSocket
    // Stay connected to preserve the session and messages
    // Save current room messages before navigating back
    if (roomId && messages.length > 0 && onSaveMessages) {
      console.log('Saving messages before back to room list:', roomId);
      onSaveMessages(messages);
    }
    console.log('Navigating back to room list while staying connected to room:', roomId);
    if (onLeaveRoom) {
      onLeaveRoom(); // This should only hide UI, not send WebSocket leave
    }
  };

  const handleCloseRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        leaveRoom(roomId);
        // Navigate back or show success message
        window.history.back();
      }
    } catch (error) {
      console.error('Failed to close room:', error);
    }
  };

  // Check if current user is admin/moderator
  const isAdmin = (user?.level || 0) >= 5; // Assuming level 5+ are admins

  // More lenient loading check - only require roomId and roomName
  if (!roomId || !roomName) {
    console.log('ChatRoom: Missing required props:', { roomId, roomName, isConnected });
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header placeholder */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center flex-shrink-0">
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Loading content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chat room...</p>
            <p className="text-xs text-gray-500 mt-2">Room ID: {roomId || 'Missing'}</p>
            <p className="text-xs text-gray-500">Room Name: {roomName || 'Missing'}</p>
            <p className="text-xs text-gray-500">Connected: {isConnected ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('ChatRoom: Rendering main component', { roomId, roomName, isConnected, messagesCount: messages.length });

  return (
    <div className="chat-room-main h-full flex flex-col bg-gray-50 relative" style={{ height: '100vh', maxHeight: '100vh' }}>


      {/* Messages List and Input - Full height */}
      <div className="flex-1 flex flex-col">
        {/* Member List Sheet */}
        <Sheet open={userListOpen} onOpenChange={(open) => {
          console.log('Member list sheet state change:', open);
          try {
            // Check if user is connected and in the room before opening member list
            if (open && !isConnected) {
              alert('⚠️ You are not in the chatroom. Please reconnect to view member list.');
              return;
            }
            setMemberListError(false);
            setUserListOpen(open);
          } catch (error) {
            console.error('Error handling member list sheet toggle:', error);
            setMemberListError(true);
          }
        }}>
            <SheetContent side="right" className="w-64" onPointerDownOutside={(e) => {
              // Prevent closing when clicking on trigger button
              const target = e.target as Element;
              if (target.closest('[data-member-trigger]')) {
                e.preventDefault();
              }
            }}>
              <SheetHeader>
                <SheetTitle>Participants ({roomMembers?.length || 0})</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : memberListError ? (
                  <div className="text-center py-8 text-red-500">
                    <p className="text-sm">Error loading members</p>
                    <button
                      onClick={() => {
                        setMemberListError(false);
                        setUserListOpen(false);
                      }}
                      className="text-xs mt-2 text-blue-600 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {(() => {
                        try {
                          if (isLoadingMembers) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-sm">Loading members...</p>
                              </div>
                            );
                          }

                          if (!roomMembers || roomMembers.length === 0) {
                            // Show current user if no members loaded but user is connected
                            if (user && isConnected) {
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                                    <UserAvatar
                                      username={user.username || 'You'}
                                      size="sm"
                                      isOnline={true}
                                      profilePhotoUrl={user.profilePhotoUrl}
                                      isAdmin={(user.level || 0) >= 5}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-medium text-sm text-blue-700">
                                          {user.username} (You)
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          Level {user.level || 1}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-green-600">
                                        Online
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-center py-4 text-gray-500">
                                    <p className="text-sm">You are the only member in this room</p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="text-center py-8 text-gray-500">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No members found</p>
                                <p className="text-xs mt-1">Try refreshing or check your connection</p>
                              </div>
                            );
                          }

                          return roomMembers.map((member) => {
                            if (!member || !member.user) {
                              return null;
                            }

                            return (
                              <div
                                key={`${member.user.id}-${member.user.username}`}
                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  try {
                                    const profileData = {
                                      id: member.user.id,
                                      username: member.user.username,
                                      level: member.user.level || 1,
                                      status: member.user.status || "",
                                      isOnline: member.user.isOnline || false,
                                      country: "ID",
                                      profilePhotoUrl: member.user.profilePhotoUrl,
                                      showMiniProfile: true,
                                      isAdmin: (member.user.level || 0) >= 5,
                                    };
                                    onUserClick(profileData);
                                    setUserListOpen(false);
                                  } catch (error) {
                                    console.error('Error handling user click:', error);
                                    setMemberListError(true);
                                  }
                                }}
                              >
                                <UserAvatar
                                  username={member.user.username || 'Unknown'}
                                  size="sm"
                                  isOnline={member.user.isOnline || false}
                                  profilePhotoUrl={member.user.profilePhotoUrl}
                                  isAdmin={(member.user.level || 0) >= 5}
                                  isMentor={member.user.isMentor}
                                  isMerchant={member.user.isMerchant}
                                  userLevel={member.user.level || 1}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <div className="flex items-center space-x-1">
                                      <span className={cn(
                                        "font-medium text-sm truncate",
                                        member.user.isMentor ? "text-red-600" :
                                        ((member.user.level || 0) >= 5 || member.user.username?.toLowerCase() === 'bob_al') ? "text-orange-600" : "text-blue-400"
                                      )}>
                                        {member.user.username || 'Unknown'}
                                      </span>
                                      <div className="flex items-center space-x-1">
                                       {/* Crown only for owner in managed rooms */}
                                        {(member.role === 'owner' || member.user.username?.toLowerCase() === roomName?.toLowerCase()) && !['1', '2', '3', '4'].includes(roomId || '') && (
                                          <Crown className="w-3 h-3 text-yellow-500" />
                                        )}
                                        {/* Mentor badge */}
                                        {member.user.isMentor && (
                                          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0 dark:bg-red-900/20 dark:text-red-200">
                                            M
                                          </Badge>
                                        )}
                                        {/* Merchant badge - check for both boolean and truthy values */}
                                        {(member.user.isMerchant === true || member.user.isMerchant) && (
                                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                                            🛍️
                                          </Badge>
                                        )}
                                        {(member.role === 'admin' || (member.user.level || 0) >= 5) && (
                                          <Badge variant="destructive" className="text-xs bg-red-600">
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="text-xs">
                                          Level {member.user.level || 1}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={cn("text-xs", (member.user.isOnline || false) ? "text-green-600" : "text-gray-500")}>
                                    {(member.user.isOnline || false) ? "Online" : "Offline"}
                                  </div>
                                </div>
                              </div>
                            );
                          }).filter(Boolean);
                        } catch (error) {
                          console.error('Error rendering member list:', error);
                          setMemberListError(true);
                          return (
                            <div className="text-center py-8 text-red-500">
                              <p className="text-sm">Error loading members</p>
                              <button
                                onClick={() => {
                                  setMemberListError(false);
                                  setUserListOpen(false);
                                }}
                                className="text-xs mt-2 text-blue-600 hover:underline"
                              >
                                Close and retry
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
        </Sheet>

        {/* Settings Dialog - Available for all users with different menus based on role */}
        <Dialog open={settingsOpen} onOpenChange={(open) => {
          console.log('Settings dialog state change:', open);
          setSettingsOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Room Settings</DialogTitle>
              <DialogDescription>
                Manage room settings and preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn("w-3 h-3 rounded-full bg-green-500")} />
                  <div className="flex items-center space-x-2">
                    <h2 className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                      {roomName}
                    </h2>
                    {user?.isMentor && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5 dark:bg-red-900/20 dark:text-red-200">
                          🎓 Mentor
                        </Badge>
                      )}
                    {user?.isMerchant && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-2 py-0.5 dark:bg-purple-900/20 dark:text-purple-200">
                        🛍️
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Back to Room List - Available for all users */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleBackToRoomList}
              >
                <Eye className="w-4 h-4 mr-2" />
                Back to Room List
              </Button>

              {/* Block User Menu - Available for level 1+ users */}
              {(user?.level || 0) >= 1 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <Ban className="w-4 h-4 mr-2" />
                      Block User
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <SheetHeader>
                      <SheetTitle>Block User from Rooms</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                      {isLoadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : memberListError ? (
                        <div className="text-center py-8 text-red-500">
                          <p className="text-sm">Error loading members</p>
                          <button
                            onClick={() => {
                              setMemberListError(false);
                              setUserListOpen(false);
                            }}
                            className="text-xs mt-2 text-blue-600 hover:underline"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-4">
                          <div className="space-y-3">
                            {(() => {
                              try {
                                if (!roomMembers || roomMembers.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No other members found</p>
                                    </div>
                                  );
                                }

                                return roomMembers
                                  .filter(member => member.user.id !== user?.id) // Don't show current user
                                  .map((member) => {
                                    if (!member || !member.user) {
                                      return null;
                                    }
                                    return (
                                      <Card key={member.user.id} className="p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <UserAvatar
                                              username={member.user.username || 'Unknown'}
                                              size="sm"
                                              isOnline={member.user.isOnline || false}
                                              profilePhotoUrl={member.user.profilePhotoUrl}
                                              isAdmin={(member.user.level || 0) >= 5}
                                              isMentor={member.user.isMentor}
                                              isMerchant={member.user.isMerchant}
                                              userLevel={member.user.level || 1}
                                            />
                                            <div>
                                              <div className="flex items-center space-x-2 mb-1">
                                                <div className="flex items-center space-x-1">
                                                  <span className={cn(
                                                    "font-medium text-sm truncate",
                                                    member.user.isMentor ? "text-red-600" :
                                                    ((member.user.level || 0) >= 5 || member.user.username?.toLowerCase() === 'bob_al') ? "text-orange-600" : "text-blue-400"
                                                  )}>
                                                    {member.user.username || 'Unknown'}
                                                  </span>
                                                  <div className="flex items-center space-x-1">
                                                    {/* Crown only for owner in managed rooms */}
                                                    {(member.role === 'owner' || member.user.username?.toLowerCase() === roomName?.toLowerCase()) && !['1', '2', '3', '4'].includes(roomId || '') && (
                                                      <Crown className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                    {/* Mentor badge */}
                                                    {member.user.isMentor && (
                                                      <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0 dark:bg-red-900/20 dark:text-red-200">
                                                        M
                                                      </Badge>
                                                    )}
                                                    {/* Merchant badge */}
                                                    {(member.user.isMerchant === true || member.user.isMerchant) && (
                                                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                                                        🛍️
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <Badge variant="outline" className="text-xs">
                                                    Level {member.user.level || 1}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex space-x-2">
                                            {/* Block Button - Only for level 1+ users */}
                                            {(user?.level || 0) >= 1 && (
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="text-xs"
                                                    disabled={(member.user.level || 0) >= 1} // Disable for level 1+ admins
                                                  >
                                                    {(member.user.level || 0) >= 1 ? 'Admin' : 'Block'}
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Block User from Rooms</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to block {member.user.username} from all chat rooms?
                                                      This action will prevent them from accessing any chat rooms.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                      onClick={() => handleBlockUser(member.user.id, member.user.username)}
                                                      className="bg-red-600 hover:bg-red-700"
                                                    >
                                                      Block User
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                          </div>
                                        </div>
                                      </Card>
                                    );
                                  }).filter(Boolean);
                                } catch (error) {
                                  console.error('Error rendering member list for block menu:', error);
                                  setMemberListError(true);
                                  return (
                                    <div className="text-center py-8 text-red-500">
                                      <p className="text-sm">Error loading members</p>
                                      <button
                                        onClick={() => {
                                          setMemberListError(false);
                                          setUserListOpen(false);
                                        }}
                                        className="text-xs mt-2 text-blue-600 hover:underline"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  );
                                }
                              })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Kick User Menu - Available for level 1+ users */}
              {(user?.level || 0) >= 1 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-orange-600 hover:text-orange-700">
                      <UserMinus className="w-4 h-4 mr-2" />
                      Kick User
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <SheetHeader>
                      <SheetTitle>Kick User from Room</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                      {isLoadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : memberListError ? (
                        <div className="text-center py-8 text-red-500">
                          <p className="text-sm">Error loading members</p>
                          <button
                            onClick={() => {
                              setMemberListError(false);
                              setUserListOpen(false);
                            }}
                            className="text-xs mt-2 text-blue-600 hover:underline"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-4">
                          <div className="space-y-3">
                            {(() => {
                              try {
                                if (!roomMembers || roomMembers.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No other members found</p>
                                    </div>
                                  );
                                }

                                return roomMembers
                                  .filter(member => member.user.id !== user?.id) // Don't show current user
                                  .map((member) => {
                                    if (!member || !member.user) {
                                      return null;
                                    }
                                    return (
                                      <Card key={member.user.id} className="p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <UserAvatar
                                              username={member.user.username || 'Unknown'}
                                              size="sm"
                                              isOnline={member.user.isOnline || false}
                                              profilePhotoUrl={member.user.profilePhotoUrl}
                                              isAdmin={(member.user.level || 0) >= 5}
                                              isMentor={member.user.isMentor}
                                              isMerchant={member.user.isMerchant}
                                              userLevel={member.user.level || 1}
                                            />
                                            <div>
                                              <div className="flex items-center space-x-2 mb-1">
                                                <div className="flex items-center space-x-1">
                                                  <span className={cn(
                                                    "font-medium text-sm truncate",
                                                    member.user.isMentor ? "text-red-600" :
                                                    ((member.user.level || 0) >= 5 || member.user.username?.toLowerCase() === 'bob_al') ? "text-orange-600" : "text-blue-400"
                                                  )}>
                                                    {member.user.username || 'Unknown'}
                                                  </span>
                                                  <div className="flex items-center space-x-1">
                                                    {/* Crown only for owner in managed rooms */}
                                                    {(member.role === 'owner' || member.user.username?.toLowerCase() === roomName?.toLowerCase()) && !['1', '2', '3', '4'].includes(roomId || '') && (
                                                      <Crown className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                    {/* Mentor badge */}
                                                    {member.user.isMentor && (
                                                      <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0 dark:bg-red-900/20 dark:text-red-200">
                                                        M
                                                      </Badge>
                                                    )}
                                                    {/* Merchant badge */}
                                                    {(member.user.isMerchant === true || member.user.isMerchant) && (
                                                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                                                        🛍️
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <Badge variant="outline" className="text-xs">
                                                    Level {member.user.level || 1}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex space-x-2">
                                            {/* Vote Kick Button */}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-xs text-orange-600 hover:bg-orange-50"
                                              onClick={() => handleVoteKick(member.user.id)}
                                            >
                                              Vote Kick
                                            </Button>
                                            {/* Direct Kick Button - For level 1+ users */}
                                            {(user?.level || 0) >= 1 && (
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="text-xs"
                                                  >
                                                    Kick
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Kick User</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to kick {member.user.username} from {roomName}?
                                                      This action will immediately remove them from the room.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                      onClick={() => handleKickUser(member.user.id, member.user.username)}
                                                      className="bg-red-600 hover:bg-red-700"
                                                    >
                                                      Kick User
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                          </div>
                                        </div>
                                      </Card>
                                    );
                                  }).filter(Boolean);
                                } catch (error) {
                                  console.error('Error rendering member list for kick menu:', error);
                                  setMemberListError(true);
                                  return (
                                    <div className="text-center py-8 text-red-500">
                                      <p className="text-sm">Error loading members</p>
                                      <button
                                        onClick={() => {
                                          setMemberListError(false);
                                          setUserListOpen(false);
                                        }}
                                        className="text-xs mt-2 text-blue-600 hover:underline"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  );
                                }
                              })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Leave Room - Available for all users */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Room
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Room</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave {roomName}?
                      {user?.isMentor && " As a mentor, you can rejoin anytime to continue mentoring."}
                      {!user?.isMentor && " You will need to rejoin to continue chatting."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveRoom} className="bg-red-600 hover:bg-red-700">
                      {user?.isMentor ? "Leave as Mentor" : "Leave Room"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Close Room - Only for admins */}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <X className="w-4 h-4 mr-2" />
                      Close Room
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Room</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to close {roomName}? This action cannot be undone and will remove all members.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCloseRoom} className="bg-red-600 hover:bg-red-700">
                        Close Room
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Messages List - Takes remaining space */}
        <div className="chat-room-messages flex-1 min-h-0 overflow-hidden">
          <MessageList
            messages={messages}
            onUserClick={handleChatUser}
            roomName={roomName}
            isAdmin={isAdmin}
            currentUserId={user?.id}
          />
        </div>

        {/* Message Input - Fixed at bottom */}
        <MessageInput onSendMessage={handleSendMessage} roomId={roomId} />
      </div>

      


    </div>
  );
}