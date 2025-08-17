import React, { useState, useRef, useEffect } from "react";
import { X, MessageCircle, Users, Settings, UserMinus, LogOut, Eye, Ban } from "lucide-react";
import { ChatRoom } from "./chat-room";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Crown } from "lucide-react"; // Import Crown for merchant badge
import { UserAvatar } from '../user/user-avatar'; // Correct path to UserAvatar component
import { Badge } from "@/components/ui/badge"; // Assuming Badge component exists
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Room {
  id: string;
  name: string;
  messages: any[];
  typingUsers?: string[]; // Array of usernames who are typing
}

interface MultiRoomTabsProps {
  rooms: Room[];
  activeRoomIndex: number;
  onSwitchRoom: (index: number) => void;
  onCloseRoom: (index: number) => void;
  onUserClick?: (profile: any) => void;
  onSaveMessages: (roomId: string, messages: any[]) => void;
  onBackToRoomList: () => void; // Added prop
  isDarkMode?: boolean;
}

export function MultiRoomTabs({
  rooms,
  activeRoomIndex,
  onSwitchRoom,
  onCloseRoom,
  onUserClick,
  onSaveMessages,
  onBackToRoomList, // Destructure the new prop
  isDarkMode = false
}: MultiRoomTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [userListOpen, setUserListOpen] = useState(false); // Renamed for clarity with Sheet component
  const [settingsOpen, setSettingsOpen] = useState(false); // Renamed for clarity with Sheet component
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map()); // roomId -> array of usernames
  const [hasNewMessages, setHasNewMessages] = useState<Map<string, boolean>>(new Map()); // roomId -> has new messages
  const [memberListError, setMemberListError] = useState(false);
  const { isConnected } = useWebSocket();
  const { user } = useAuth();

  // State for managing members and loading status
  const [roomMembers, setRoomMembers] = useState<any[]>([]); // Assuming member data structure
  const [isLoadingMembers, setIsLoadingMembers] = useState(false); // Loading state for members

  // State for active kick votes and their timers
  const [activeKickVotes, setActiveKickVotes] = useState<{ [key: string]: { voters: Set<string>; remainingTime: number; targetUser: any } }>({});
  const kickVoteDuration = 60; // seconds

  // Add safety checks with better error handling
  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    console.log('MultiRoomTabs: No rooms available or invalid rooms prop', rooms);
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No rooms available</p>
        </div>
      </div>
    );
  }

  // Ensure activeRoomIndex is valid
  const safeActiveRoomIndex = Math.max(0, Math.min(activeRoomIndex, rooms.length - 1));

  // Use useEffect to handle activeRoomIndex correction safely
  useEffect(() => {
    if (activeRoomIndex !== safeActiveRoomIndex && rooms.length > 0) {
      console.log('MultiRoomTabs: Correcting activeRoomIndex from', activeRoomIndex, 'to', safeActiveRoomIndex);
      onSwitchRoom(safeActiveRoomIndex);
    }
  }, [activeRoomIndex, safeActiveRoomIndex, onSwitchRoom, rooms.length]);

  // Sync room states across tabs using localStorage
  useEffect(() => {
    if (!user) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `multiRoomState-${user.id}` && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          console.log('Multi-room state synced from another tab:', newState);
          // Update local state based on other tab changes
          // This is a placeholder. A more robust implementation would
          // involve comparing states and selectively updating.
          // For now, we'll assume the other tab's state is the source of truth.
          // However, directly setting state here might cause infinite loops if not careful.
          // A better approach would be to trigger a re-initialization or update
          // based on the new state information.
        } catch (error) {
          console.error('Failed to sync multi-room state:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // Function to save current room state to localStorage
  const saveRoomStateToLocalStorage = (currentRooms: Room[], currentActiveRoomIndex: number) => {
    if (!user) return;
    try {
      const stateToSave = {
        rooms: currentRooms.map(room => ({ id: room.id, name: room.name, messages: room.messages })), // Save essential room data
        activeRoomIndex: currentActiveRoomIndex,
      };
      localStorage.setItem(`multiRoomState-${user.id}`, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save multi-room state:', error);
    }
  };

  // Save state when rooms or activeRoomIndex changes
  useEffect(() => {
    saveRoomStateToLocalStorage(rooms, activeRoomIndex);
  }, [rooms, activeRoomIndex, user]); // Include user in dependencies to re-save if user changes

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    // Prevent default to avoid scrolling during swipe
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startXRef.current - endX;
    const threshold = 50; // Reduced threshold for easier swiping

    if (Math.abs(diff) > threshold) {
      // Multiple methods to ensure keyboard dismissal
      try {
        // Method 1: Blur active element
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Method 2: Find and blur all input elements
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          if (input instanceof HTMLElement) {
            input.blur();
          }
        });
        
        // Method 3: Create and focus a dummy element to force keyboard close
        const dummyElement = document.createElement('input');
        dummyElement.style.position = 'absolute';
        dummyElement.style.left = '-9999px';
        dummyElement.style.opacity = '0';
        dummyElement.style.pointerEvents = 'none';
        document.body.appendChild(dummyElement);
        dummyElement.focus();
        setTimeout(() => {
          dummyElement.blur();
          document.body.removeChild(dummyElement);
        }, 100);
        
        // Method 4: Scroll and viewport manipulation for mobile
        if (window.navigator.userAgent.includes('Mobile') || window.innerHeight < window.outerHeight) {
          window.scrollTo(0, 0);
          // Force viewport refresh
          const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
          if (viewport) {
            const content = viewport.content;
            viewport.content = content + ', user-scalable=no';
            setTimeout(() => {
              viewport.content = content;
            }, 100);
          }
        }
      } catch (error) {
        console.log('Error dismissing keyboard:', error);
      }

      if (diff > 0 && safeActiveRoomIndex < rooms.length - 1) {
        // Swipe left - next room (UI switch only, keep connections)
        onSwitchRoom(safeActiveRoomIndex + 1);
      } else if (diff < 0 && safeActiveRoomIndex > 0) {
        // Swipe right - previous room (UI switch only, keep connections)
        onSwitchRoom(safeActiveRoomIndex - 1);
      }
    }

    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const endX = e.clientX;
    const diff = startXRef.current - endX;
    const threshold = 50; // Reduced threshold for easier swiping

    if (Math.abs(diff) > threshold) {
      // Multiple methods to ensure keyboard dismissal
      try {
        // Method 1: Blur active element
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Method 2: Find and blur all input elements
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          if (input instanceof HTMLElement) {
            input.blur();
          }
        });
        
        // Method 3: Create and focus a dummy element to force keyboard close
        const dummyElement = document.createElement('input');
        dummyElement.style.position = 'absolute';
        dummyElement.style.left = '-9999px';
        dummyElement.style.opacity = '0';
        dummyElement.style.pointerEvents = 'none';
        document.body.appendChild(dummyElement);
        dummyElement.focus();
        setTimeout(() => {
          dummyElement.blur();
          document.body.removeChild(dummyElement);
        }, 100);
      } catch (error) {
        console.log('Error dismissing keyboard:', error);
      }

      if (diff > 0 && safeActiveRoomIndex < rooms.length - 1) {
        // Swipe left - next room
        onSwitchRoom(safeActiveRoomIndex + 1);
      } else if (diff < 0 && safeActiveRoomIndex > 0) {
        // Swipe right - previous room
        onSwitchRoom(safeActiveRoomIndex - 1);
      }
    }

    setIsDragging(false);
  };

  // WebSocket event listeners and new message tracking
  useEffect(() => {
    const handleUserTyping = (event: CustomEvent) => {
      const { userId, roomId, isTyping, username } = event.detail;

      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const currentTypers = newMap.get(roomId) || [];

        if (isTyping && username) {
          // Add user to typing list if not already there
          if (!currentTypers.includes(username)) {
            newMap.set(roomId, [...currentTypers, username]);
          }
        } else {
          // Remove user from typing list
          const filteredTypers = currentTypers.filter(user => user !== username);
          if (filteredTypers.length > 0) {
            newMap.set(roomId, filteredTypers);
          } else {
            newMap.delete(roomId);
          }
        }

        return newMap;
      });
    };

    const handleNewMessage = (event: CustomEvent) => {
      const message = event.detail;
      console.log('MultiRoomTabs: Received new message:', message);

      // Ensure message has required fields
      if (!message || !message.content || !message.roomId) {
        console.error('MultiRoomTabs: Invalid message data received:', message);
        return;
      }

      // Strict roomId filtering - only process messages for existing rooms
      const targetRoom = rooms.find(room => room.id === message.roomId);
      if (!targetRoom) {
        console.log('MultiRoomTabs: Message for non-existent room ignored:', message.roomId);
        return;
      }

      if (message.roomId) {
        const currentActiveRoom = rooms[activeRoomIndex];

        console.log('MultiRoomTabs: Adding message to room:', message.roomId);

        // Ensure message has proper structure with strict roomId validation
        const messageToAdd = {
          id: message.id || `msg-${Date.now()}-${Math.random()}`,
          content: message.content,
          senderId: message.senderId,
          createdAt: message.createdAt || new Date().toISOString(),
          sender: message.sender || {
            id: message.senderId,
            username: message.messageType === 'bot' ? 'LowCardBot' : 'User',
            level: message.messageType === 'bot' ? 0 : 1,
            isOnline: true
          },
          messageType: message.messageType || 'text',
          cardImage: message.cardImage,
          roomId: message.roomId // Ensure roomId is preserved
        };

        // Double-check roomId matches before adding to prevent cross-room contamination
        if (messageToAdd.roomId === targetRoom.id) {
          // Update the room's messages - ensure we don't duplicate messages
          const existingMessageIds = new Set((targetRoom.messages || []).map(m => m.id));
          if (!existingMessageIds.has(messageToAdd.id)) {
            targetRoom.messages = [...(targetRoom.messages || []), messageToAdd];

            // Save to localStorage immediately with timestamp
            const localStorageKey = `chat_${message.roomId}`;
            const messagesWithTimestamp = {
              messages: targetRoom.messages,
              savedAt: Date.now(),
              roomId: message.roomId
            };
            localStorage.setItem(localStorageKey, JSON.stringify(messagesWithTimestamp));

            // Auto-scroll to bottom if this is the active room - immediate
            if (currentActiveRoom && message.roomId === currentActiveRoom.id) {
              requestAnimationFrame(() => {
                const messagesContainer = document.querySelector('.chat-room-messages');
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
              });
            }

            // If message is for a room that's not currently active, mark it as having new messages
            if (currentActiveRoom && message.roomId !== currentActiveRoom.id) {
              setHasNewMessages(prev => {
                const newMap = new Map(prev);
                newMap.set(message.roomId, true);
                return newMap;
              });
            }
          } else {
            console.log('MultiRoomTabs: Duplicate message ignored:', messageToAdd.id);
          }
        } else {
          console.error('MultiRoomTabs: RoomId mismatch - message not added:', {
            messageRoomId: messageToAdd.roomId,
            targetRoomId: targetRoom.id
          });
        }
      }
    };

    const handleErrorMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      console.error('MultiRoomTabs: Error message received:', message);

      // Show error message in current active room
      const currentActiveRoom = rooms[activeRoomIndex];
      if (currentActiveRoom) {
        const errorMessage = {
          id: `error-${Date.now()}`,
          content: message,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'system',
            username: 'System',
            level: 0,
            isOnline: true
          }
        };

        currentActiveRoom.messages = [...(currentActiveRoom.messages || []), errorMessage];
      }
    };

    window.addEventListener('userTyping', handleUserTyping as EventListener);
    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('errorMessage', handleErrorMessage as EventListener);

    return () => {
      window.removeEventListener('userTyping', handleUserTyping as EventListener);
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('errorMessage', handleErrorMessage as EventListener);
    };
  }, [activeRoomIndex, rooms]);

  // Auto-clear expired messages for all rooms every 30 seconds
  useEffect(() => {
    const MESSAGE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

    const clearExpiredMessagesForAllRooms = () => {
      if (!user || rooms.length === 0) return;

      rooms.forEach(room => {
        if (!room || !room.id) return;

        const localStorageKey = `chat_${room.id}`;
        const storedData = localStorage.getItem(localStorageKey);

        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);

            // Check if this is old format (array) or new format (object with timestamp)
            if (Array.isArray(parsedData)) {
              // Old format - clear immediately as we can't determine age
              console.log('MultiRoomTabs: Clearing old format messages for room:', room.id);
              localStorage.removeItem(localStorageKey);
              // Clear messages from room object
              room.messages = [];
              return;
            }

            // New format with timestamp
            if (parsedData.savedAt && parsedData.messages) {
              const messageAge = Date.now() - parsedData.savedAt;

              if (messageAge > MESSAGE_EXPIRY_TIME) {
                console.log('MultiRoomTabs: Clearing expired messages for room:', room.id, 'Age:', Math.round(messageAge / 1000 / 60), 'minutes');
                localStorage.removeItem(localStorageKey);

                // Clear messages from room object
                room.messages = [];

                // Save empty state with new timestamp
                const emptyMessagesWithTimestamp = {
                  messages: [],
                  savedAt: Date.now(),
                  roomId: room.id
                };
                localStorage.setItem(localStorageKey, JSON.stringify(emptyMessagesWithTimestamp));
              }
            }
          } catch (error) {
            console.error('MultiRoomTabs: Error checking message expiry for room:', room.id, error);
            // If there's an error parsing, clear the corrupted data
            localStorage.removeItem(localStorageKey);
            room.messages = [];
          }
        }
      });
    };

    // Clear expired messages immediately on component mount
    clearExpiredMessagesForAllRooms();

    // Set up interval to check for expired messages every 30 seconds
    const interval = setInterval(clearExpiredMessagesForAllRooms, 30000);

    return () => clearInterval(interval);
  }, [rooms, user]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === 'ArrowLeft' && activeRoomIndex > 0) {
          e.preventDefault();
          onSwitchRoom(activeRoomIndex - 1);
        } else if (e.key === 'ArrowRight' && activeRoomIndex < rooms.length - 1) {
          e.preventDefault();
          onSwitchRoom(activeRoomIndex + 1);
        } else if (e.key === 'w') {
          e.preventDefault();
          onCloseRoom(activeRoomIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRoomIndex, rooms.length, onSwitchRoom, onCloseRoom]);

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
            delete updatedVotes[userId];
            changed = true;
          }
        }
        return changed ? updatedVotes : prevVotes;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Fetch room members when the active room changes
  useEffect(() => {
    const fetchRoomMembers = async () => {
      if (!isConnected || !user || !rooms || rooms.length === 0) {
        setRoomMembers([]);
        return;
      }
      const currentRoomId = rooms[safeActiveRoomIndex]?.id;
      if (!currentRoomId) {
        setRoomMembers([]);
        return;
      }

      setIsLoadingMembers(true);
      setMemberListError(false);
      try {
        // Fetch actual room members
        const response = await fetch(`/api/rooms/${currentRoomId}/members`);
        if (response.ok) {
          const data = await response.json();
          setRoomMembers(data);
        } else {
          // Fallback to current user if API call fails
          const mockMembers = [
            { user: { id: user.id, username: user.username, level: user.level, status: "Online", isOnline: true, profilePhotoUrl: user.profilePhotoUrl } }
          ];
          setRoomMembers(mockMembers);
        }
      } catch (error) {
        console.error("Failed to fetch room members:", error);
        setMemberListError(true);
        // Fallback to current user
        const mockMembers = [
          { user: { id: user.id, username: user.username, level: user.level, status: "Online", isOnline: true, profilePhotoUrl: user.profilePhotoUrl } }
        ];
        setRoomMembers(mockMembers);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchRoomMembers();
  }, [safeActiveRoomIndex, rooms, isConnected, user]); // Re-fetch when active room or connection status changes

  // Kick vote handler functions
  const handleVoteKick = async (targetUserId: string) => {
    if (!user?.id || !rooms[safeActiveRoomIndex]?.id) return;

    try {
      const activeVote = activeKickVotes[targetUserId];
      if (!activeVote) return; // No active vote

      if (activeVote.voters.has(user.id)) {
        // Remove vote
        activeVote.voters.delete(user.id);
      } else {
        // Add vote
        activeVote.voters.add(user.id);
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

  const handleStartKickVote = (targetUser: any) => {
    if (!user?.id || !rooms[safeActiveRoomIndex]?.id) return;

    // Prevent kicking admin users
    if ((targetUser.level || 0) >= 5) {
      alert('❌ Cannot kick admin users.');
      return;
    }

    if (targetUser.id === user?.id) {
      alert('You cannot kick yourself.');
      return;
    }

    // Check if a kick vote is already active for this user
    if (activeKickVotes[targetUser.id]) {
      alert(`A kick vote for ${targetUser.username} is already in progress.`);
      return;
    }

    // Start a new kick vote
    const newKickVote = {
      voters: new Set<string>([user.id]),
      remainingTime: kickVoteDuration,
      targetUser: targetUser,
    };

    setActiveKickVotes(prev => ({
      ...prev,
      [targetUser.id]: newKickVote,
    }));
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
        alert(`${username} has been blocked from all chat rooms`);
        // Refresh members after block
        const currentRoomId = rooms[safeActiveRoomIndex]?.id;
        if (currentRoomId) {
          const fetchRoomMembers = async () => {
            try {
              const response = await fetch(`/api/rooms/${currentRoomId}/members`);
              if (response.ok) {
                const data = await response.json();
                setRoomMembers(data);
              }
            } catch (error) {
              console.error("Failed to refresh room members:", error);
            }
          };
          setTimeout(fetchRoomMembers, 100);
        }
      } else {
        const errorMessage = await response.json();
        alert(`Failed to block ${username}: ${errorMessage.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to block user:', error);
      alert(`An error occurred while trying to block ${username}.`);
    }
  };

  const handleKickUser = async (userId: string, username: string) => {
    try {
      const currentRoomId = rooms[safeActiveRoomIndex]?.id;
      if (!currentRoomId) return;

      const response = await fetch(`/api/rooms/${currentRoomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        console.log(`${username} has been kicked from the room`);
        // Refresh members after kick
        const fetchRoomMembers = async () => {
          try {
            const response = await fetch(`/api/rooms/${currentRoomId}/members`);
            if (response.ok) {
              const data = await response.json();
              setRoomMembers(data);
            }
          } catch (error) {
            console.error("Failed to refresh room members:", error);
          }
        };
        setTimeout(fetchRoomMembers, 100);
      } else {
        const errorMessage = await response.json();
        alert(`Failed to kick ${username}: ${errorMessage.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
      alert(`An error occurred while trying to kick ${username}.`);
    }
  };

  if (rooms.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No rooms open</p>
          <p className="text-sm text-gray-400">Join a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Room Content with Swipe Support */}
      <div
        className="flex-1 relative"
        style={{ touchAction: 'pan-y' }} // Allow vertical scrolling but handle horizontal gestures
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="relative w-full h-full">
          {rooms.map((room, index) => {
            // Enhanced room validation with better error handling
            if (!room || typeof room !== 'object' || !room.id || !room.name) {
              console.error('MultiRoomTabs: Invalid room data at index', index, room);
              return null; // Return null instead of rendering invalid content
            }

            const isActive = safeActiveRoomIndex === index;
            const isMerchant = user && user.isMerchant;

            return (
              <div
                key={`room-content-${room.id}-${index}`}
                className={cn(
                  "absolute inset-0 w-full h-full transition-opacity duration-200",
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
                style={{
                  display: isActive ? 'block' : 'none'
                }}
              >
                {isActive && (
                  <div className="h-full flex flex-col">
                    {/* Room Header - Always visible */}
                    <div className={cn("border-b px-4 py-3 flex items-center justify-between flex-shrink-0 relative z-30",
                      isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
                    )}>
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-3 h-3 rounded-full bg-green-500")} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h2 className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                              {room?.name || 'Unknown Room'}
                            </h2>
                            {user?.isMentor && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5 dark:bg-red-900/20 dark:text-red-200">
                                M Mentor
                              </Badge>
                            )}
                          </div>
                          <p className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                            Online members
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Member List Button */}
                        <button
                          onClick={() => {
                            try {
                              // Check if user is connected and in the room before opening member list
                              if (!isConnected) {
                                alert('⚠️ You are not in the chatroom. Please reconnect to view member list.');
                                return;
                              }
                              setMemberListError(false);
                              setUserListOpen(true);
                            } catch (error) {
                              console.error('Error toggling member list:', error);
                              setMemberListError(true);
                            }
                          }}
                          className={cn(
                            "p-2 rounded-md flex items-center justify-center transition-colors",
                            isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          )}
                          title="Member List"
                        >
                          <Users className="w-5 h-5" />
                        </button>

                        {/* Settings Button - Available for all users */}
                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                          <button
                            onClick={() => setSettingsOpen(true)}
                            className={cn(
                              "p-2 rounded-md flex items-center justify-center transition-colors",
                              isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            )}
                            title="Room Settings"
                          >
                            <Settings className="w-5 h-5" />
                          </button>

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
                                      {rooms[safeActiveRoomIndex]?.name || 'Unknown Room'}
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
                                onClick={() => {
                                  setSettingsOpen(false);
                                  onBackToRoomList();
                                }}
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
                                      <div className="text-sm text-gray-600">
                                        Select users to block from all chat rooms
                                      </div>
                                      {isLoadingMembers ? (
                                        <div className="flex items-center justify-center py-8">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 overflow-y-auto p-4">
                                          <div className="space-y-3">
                                            {roomMembers
                                              .filter(member => member.user.id !== user?.id) // Don't show current user
                                              .map((member) => {
                                                if (!member || !member.user) return null;

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
                                                                ((member.user.level || 0) >= 5) ? "text-orange-600" : "text-blue-400"
                                                              )}>
                                                                {member.user.username || 'Unknown'}
                                                              </span>
                                                              <div className="flex items-center space-x-1">
                                                                {member.user.isMentor && (
                                                                  <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0">
                                                                    M
                                                                  </Badge>
                                                                )}
                                                                {member.user.isMerchant && (
                                                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                                                                    🛍️
                                                                  </Badge>
                                                                )}
                                                                {(member.user.level || 0) >= 5 && (
                                                                  <Badge variant="destructive" className="text-xs bg-red-600">
                                                                    Admin
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
                                                        {/* Block Button */}
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
                                                      </div>
                                                    </div>
                                                  </Card>
                                                );
                                              })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </SheetContent>
                                </Sheet>
                              )}

                              {/* Banned User Menu - Available for admins only */}
                              {(user?.isAdmin || (user?.level || 0) >= 5) && (
                                <Sheet>
                                  <SheetTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                                      <Ban className="w-4 h-4 mr-2" />
                                      Manage Banned Users
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent side="right" className="w-64">
                                    <SheetHeader>
                                      <SheetTitle>Banned Users Management</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-4 space-y-4">
                                      <div className="text-sm text-gray-600">
                                        Users banned from all chat rooms
                                      </div>
                                      {/* This would need a separate API endpoint to fetch banned users */}
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500">
                                          Banned users list would appear here
                                        </div>
                                      </div>
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
                                      ) : (
                                        <div className="flex-1 overflow-y-auto p-4">
                                          <div className="space-y-3">
                                            {roomMembers
                                              .filter(member => member.user.id !== user?.id) // Don't show current user
                                              .map((member) => {
                                                if (!member || !member.user) return null;

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
                                                                ((member.user.level || 0) >= 5) ? "text-orange-600" : "text-blue-400"
                                                              )}>
                                                                {member.user.username || 'Unknown'}
                                                              </span>
                                                              <div className="flex items-center space-x-1">
                                                                {member.user.isMentor && (
                                                                  <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0">
                                                                    M
                                                                  </Badge>
                                                                )}
                                                                {member.user.isMerchant && (
                                                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                                                                    🛍️
                                                                  </Badge>
                                                                )}
                                                                {(member.user.level || 0) >= 5 && (
                                                                  <Badge variant="destructive" className="text-xs bg-red-600">
                                                                    Admin
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
                                                          className={cn(
                                                            "text-xs",
                                                            activeKickVotes[member.user.id]?.voters.has(user?.id || '')
                                                              ? "bg-orange-100 text-orange-600 border-orange-300"
                                                              : "text-orange-600 hover:bg-orange-50"
                                                          )}
                                                          onClick={() => {
                                                            if (activeKickVotes[member.user.id]) {
                                                              handleVoteKick(member.user.id);
                                                            } else {
                                                              handleStartKickVote(member.user);
                                                            }
                                                          }}
                                                        >
                                                          {activeKickVotes[member.user.id]
                                                            ? `Vote ${activeKickVotes[member.user.id].voters.size}/${Math.ceil((roomMembers?.length || 1) / 2)}`
                                                            : 'Start Vote'
                                                          }
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
                                                                  Are you sure you want to kick {member.user.username} from {rooms[safeActiveRoomIndex]?.name}?
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
                                                    {/* Show active vote status */}
                                                    {activeKickVotes[member.user.id] && (
                                                      <div className="mt-2 text-xs text-gray-500">
                                                        Vote expires in: {activeKickVotes[member.user.id].remainingTime}s
                                                      </div>
                                                    )}
                                                  </Card>
                                                );
                                              })}
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
                                      Are you sure you want to leave {rooms[safeActiveRoomIndex]?.name}?
                                      {user?.isMentor && " As a mentor, you can rejoin anytime to continue mentoring."}
                                      {!user?.isMentor && " You will need to rejoin to continue chatting."}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setSettingsOpen(false);
                                        // Clear localStorage for the room being closed
                                        const roomToClose = rooms[safeActiveRoomIndex];
                                        if (roomToClose) {
                                          // Clear main chat messages (both old and new formats)
                                          const localStorageKey = `chat_${roomToClose.id}`;
                                          const oldFormatKey = `chatMessages-${roomToClose.id}`;
                                          localStorage.removeItem(localStorageKey);
                                          localStorage.removeItem(oldFormatKey);

                                          // Clear saved room states
                                          const savedRoomStates = JSON.parse(localStorage.getItem('savedRoomStates') || '{}');
                                          if (savedRoomStates[roomToClose.id]) {
                                            delete savedRoomStates[roomToClose.id];
                                            localStorage.setItem('savedRoomStates', JSON.stringify(savedRoomStates));
                                          }

                                          // Clear multi-room state
                                          if (user) {
                                            const multiRoomStateKey = `multiRoomState-${user.id}`;
                                            const multiRoomState = JSON.parse(localStorage.getItem(multiRoomStateKey) || '{}');
                                            if (multiRoomState.rooms) {
                                              multiRoomState.rooms = multiRoomState.rooms.filter((room: any) => room.id !== roomToClose.id);
                                              localStorage.setItem(multiRoomStateKey, JSON.stringify(multiRoomState));
                                            }
                                          }

                                          console.log('Cleared ALL localStorage data for closed room:', roomToClose.id);
                                        }
                                        onCloseRoom(safeActiveRoomIndex);
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {user?.isMentor ? "Leave as Mentor" : "Leave Room"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Back to Room List Button */}
                        <button
                          onClick={() => {
                            // Navigate back to room list while keeping all rooms connected
                            // This should only change UI state, not WebSocket connections
                            onBackToRoomList();
                          }}
                          className={cn(
                            "p-2 rounded-md flex items-center justify-center transition-colors",
                            isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          )}
                          title="Back to Room List"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Dots indicator - Always show for visual consistency */}
                    <div className={cn("flex justify-center py-2 border-b",
                      isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
                    )}>
                      <div className="flex space-x-2">
                        {rooms.map((roomForDot, dotIndex) => (
                          <div
                            key={`dot-${roomForDot?.id || dotIndex}`}
                            className={cn(
                              "w-3 h-3 rounded-full transition-all duration-200 cursor-pointer shadow-sm",
                              safeActiveRoomIndex === dotIndex
                                ? "bg-blue-500 scale-110"
                                : (isDarkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-400 hover:bg-gray-500")
                            )}
                            onClick={() => onSwitchRoom(dotIndex)}
                          />
                        ))}
                        {/* Show indicator even for single room */}
                        {rooms.length === 1 && (
                          <div className="text-xs text-gray-500 ml-2">
                            Room {safeActiveRoomIndex + 1} of {rooms.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Multi-Room Tabs - Below header */}
                    {rooms.length > 1 && (
                      <div className={cn("border-b flex-shrink-0 overflow-x-auto scrollbar-hide relative z-20",
                        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                      )}>
                        <div className="flex min-w-max px-2 py-2 gap-2">
                          {rooms.map((tabRoom, tabIndex) => (
                            <div
                              key={`tab-${tabRoom.id}-${tabIndex}`}
                              className={cn(
                                "flex items-center px-3 py-1.5 rounded-md cursor-pointer transition-all duration-200 relative group flex-shrink-0",
                                "min-w-[80px] max-w-[120px] text-xs border",
                                activeRoomIndex === tabIndex
                                  ? (isDarkMode ? "bg-blue-600 text-white border-blue-500" : "bg-blue-500 text-white border-blue-400")
                                  : (isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600" : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"),
                                // Add blinking animation for tabs with new messages
                                hasNewMessages.get(tabRoom.id) && activeRoomIndex !== tabIndex ? "animate-blink-tab" : ""
                              )}
                              onClick={() => {
                                // Multiple methods to ensure keyboard dismissal
                                try {
                                  // Method 1: Blur active element
                                  const activeElement = document.activeElement as HTMLElement;
                                  if (activeElement && activeElement.blur) {
                                    activeElement.blur();
                                  }
                                  
                                  // Method 2: Find and blur all input elements
                                  const inputs = document.querySelectorAll('input, textarea');
                                  inputs.forEach(input => {
                                    if (input instanceof HTMLElement) {
                                      input.blur();
                                    }
                                  });
                                  
                                  // Method 3: Create dummy element for keyboard dismissal
                                  const dummyElement = document.createElement('input');
                                  dummyElement.style.position = 'absolute';
                                  dummyElement.style.left = '-9999px';
                                  dummyElement.style.opacity = '0';
                                  dummyElement.style.pointerEvents = 'none';
                                  document.body.appendChild(dummyElement);
                                  dummyElement.focus();
                                  setTimeout(() => {
                                    dummyElement.blur();
                                    document.body.removeChild(dummyElement);
                                  }, 50);
                                } catch (error) {
                                  console.log('Error dismissing keyboard:', error);
                                }

                                // Save current room messages to localStorage before switching
                                const currentRoom = rooms[activeRoomIndex];
                                if (currentRoom && currentRoom.messages && currentRoom.messages.length > 0) {
                                  const localStorageKey = `chat_${currentRoom.id}`;
                                  const messagesWithTimestamp = {
                                    messages: currentRoom.messages,
                                    savedAt: Date.now(),
                                    roomId: currentRoom.id
                                  };
                                  localStorage.setItem(localStorageKey, JSON.stringify(messagesWithTimestamp));
                                  console.log('Saved messages with timestamp to localStorage for room:', currentRoom.id);
                                }

                                // Clear new message indicator for this room
                                setHasNewMessages(prev => {
                                  const newMap = new Map(prev);
                                  newMap.delete(tabRoom.id);
                                  return newMap;
                                });
                                // Only switch UI state - maintain all WebSocket connections
                                onSwitchRoom(tabIndex);
                              }}
                            >
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                                  activeRoomIndex === tabIndex ? "bg-white" : "bg-green-500"
                                )} />
                                <span className="font-medium truncate">
                                  {tabRoom.name}
                                </span>
                              </div>

                              {/* Typing indicator for inactive rooms */}
                              {activeRoomIndex !== tabIndex && typingUsers.get(tabRoom.id) && typingUsers.get(tabRoom.id)!.length > 0 && (
                                <div className="ml-1 flex items-center">
                                  <div className="flex space-x-0.5">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                </div>
                              )}

                              {/* Message count indicator */}
                              {tabRoom.messages.length > 0 && activeRoomIndex !== tabIndex && (
                                <div className={cn(
                                  "ml-1 px-1 py-0.5 rounded-full text-[10px] bg-red-500 text-white min-w-[14px] text-center leading-none",
                                  typingUsers.get(tabRoom.id) && typingUsers.get(tabRoom.id)!.length > 0 ? "ml-0.5" : "ml-1"
                                )}>
                                  {tabRoom.messages.length > 99 ? '99+' : tabRoom.messages.length}
                                </div>
                              )}

                              {/* Close button */}
                              {rooms.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Clear ALL localStorage for the room being closed
                                    const roomToClose = rooms[tabIndex];
                                    if (roomToClose) {
                                      // Clear main chat messages (both old and new formats)
                                      const localStorageKey = `chat_${roomToClose.id}`;
                                      const oldFormatKey = `chatMessages-${roomToClose.id}`;
                                      localStorage.removeItem(localStorageKey);
                                      localStorage.removeItem(oldFormatKey);

                                      // Clear saved room states
                                      const savedRoomStates = JSON.parse(localStorage.getItem('savedRoomStates') || '{}');
                                      if (savedRoomStates[roomToClose.id]) {
                                        delete savedRoomStates[roomToClose.id];
                                        localStorage.setItem('savedRoomStates', JSON.stringify(savedRoomStates));
                                      }

                                      // Clear multi-room state
                                      if (user) {
                                        const multiRoomStateKey = `multiRoomState-${user.id}`;
                                        const multiRoomState = JSON.parse(localStorage.getItem(multiRoomStateKey) || '{}');
                                        if (multiRoomState.rooms) {
                                          multiRoomState.rooms = multiRoomState.rooms.filter((room: any) => room.id !== roomToClose.id);
                                          localStorage.setItem(multiRoomStateKey, JSON.stringify(multiRoomState));
                                        }
                                      }

                                      console.log('Cleared ALL localStorage data for closed room:', roomToClose.id);
                                    }
                                    onCloseRoom(tabIndex);
                                  }}
                                  className={cn(
                                    "ml-1 p-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0",
                                    activeRoomIndex === tabIndex
                                      ? "hover:bg-white/20 text-white/80"
                                      : (isDarkMode ? "hover:bg-gray-500 text-gray-400" : "hover:bg-gray-200 text-gray-500")
                                  )}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Room Content */}
                    <div className="flex-1 overflow-hidden" style={{ paddingTop: '8px' }}>
                      {room && room.id && room.name ? (
                        <div key={`chat-wrapper-${room.id}`}>
                          <ChatRoom
                            key={`chat-${room.id}`}
                            roomId={room.id}
                            roomName={room.name}
                            onUserClick={onUserClick || (() => {})}
                            onLeaveRoom={() => onCloseRoom(index)}
                            savedMessages={Array.isArray(room.messages) ? room.messages : []}
                            onSaveMessages={(messages) => onSaveMessages(room.id, messages)}
                            isUserListOpen={userListOpen && safeActiveRoomIndex === index}
                            onSetUserListOpen={setUserListOpen}
                            isSettingsOpen={settingsOpen && safeActiveRoomIndex === index}
                            onSetSettingsOpen={setSettingsOpen}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                            <p>Loading room...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Room Navigation Hints - Only show when multiple rooms */}
      {rooms.length > 1 && (
        <div className={cn("px-4 py-1.5 text-xs flex justify-between items-center border-t",
          isDarkMode ? "bg-gray-900 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"
        )}>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="font-medium">
                {(rooms && rooms[safeActiveRoomIndex] && rooms[safeActiveRoomIndex].name) || 'No Room'}
              </span>
              {user?.isMentor && (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1 py-0 dark:bg-red-900/20 dark:text-red-200">
                  M
                </Badge>
              )}
              {user?.isMerchant && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1 py-0 dark:bg-purple-900/20 dark:text-purple-200">
                  🛍️
                </Badge>
              )}
            </div>
            <span className="text-gray-400">•</span>
            <span>
              {safeActiveRoomIndex + 1} of {rooms?.length || 0}
            </span>
            {/* Show typing indicator for current room */}
            {rooms && rooms[safeActiveRoomIndex] && typingUsers.get(rooms[safeActiveRoomIndex].id) && typingUsers.get(rooms[safeActiveRoomIndex].id)!.length > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <div className="flex items-center space-x-1 text-blue-500">
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-[10px]">
                    {rooms && rooms[safeActiveRoomIndex] && typingUsers.get(rooms[safeActiveRoomIndex].id) ?
                      typingUsers.get(rooms[safeActiveRoomIndex].id)!.join(', ') : ''} typing...
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex space-x-3 text-[10px]">
            <span className="hidden sm:block">Swipe ← → </span>
            <span className="hidden md:block">Ctrl+← → switch</span>
          </div>
        </div>
      )}
    </div>
  );
}