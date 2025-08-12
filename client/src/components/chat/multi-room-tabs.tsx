import React, { useState, useRef, useEffect } from "react";
import { X, MessageCircle, Users, Settings } from "lucide-react";
import { ChatRoom } from "./chat-room";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Crown } from "lucide-react"; // Import Crown for merchant badge

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
    // Remove preventDefault() as it's not needed for React SyntheticEvents
    // and causes passive listener errors
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startXRef.current - endX;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeRoomIndex < rooms.length - 1) {
        // Swipe left - next room (UI switch only, keep connections)
        onSwitchRoom(activeRoomIndex + 1);
      } else if (diff < 0 && activeRoomIndex > 0) {
        // Swipe right - previous room (UI switch only, keep connections)
        onSwitchRoom(activeRoomIndex - 1);
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
    // Remove preventDefault() as it's not needed for mouse events
    // and can cause issues with passive listeners
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const endX = e.clientX;
    const diff = startXRef.current - endX;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeRoomIndex < rooms.length - 1) {
        // Swipe left - next room
        onSwitchRoom(activeRoomIndex + 1);
      } else if (diff < 0 && activeRoomIndex > 0) {
        // Swipe right - previous room
        onSwitchRoom(activeRoomIndex - 1);
      }
    }

    setIsDragging(false);
  };

  // Typing event listeners and new message tracking
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
      if (message.roomId) {
        const currentActiveRoom = rooms[activeRoomIndex];
        // If message is for a room that's not currently active, mark it as having new messages
        if (currentActiveRoom && message.roomId !== currentActiveRoom.id) {
          setHasNewMessages(prev => {
            const newMap = new Map(prev);
            newMap.set(message.roomId, true);
            return newMap;
          });
        }
      }
    };

    window.addEventListener('userTyping', handleUserTyping as EventListener);
    window.addEventListener('newMessage', handleNewMessage as EventListener);

    return () => {
      window.removeEventListener('userTyping', handleUserTyping as EventListener);
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
    };
  }, [activeRoomIndex, rooms]);

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
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ touchAction: 'pan-y' }} // Allow vertical scrolling but handle horizontal gestures
      >
        {/* Swipe indicator removed */}

        <div className="relative w-full h-full overflow-hidden">
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
                          <h2 className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800", isMerchant && "text-purple-500")}>
                            {room?.name || 'Unknown Room'}
                            {isMerchant && <Crown className="w-4 h-4 inline-block ml-1 text-purple-500" />}
                          </h2>
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

                        {/* Settings Button */}
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

                    {/* Dots Indicator - Always show for visual consistency */}
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
                                // Save current room messages to localStorage before switching
                                const currentRoom = rooms[activeRoomIndex];
                                if (currentRoom && currentRoom.messages && currentRoom.messages.length > 0) {
                                  const localStorageKey = `chatMessages-${currentRoom.id}`;
                                  localStorage.setItem(localStorageKey, JSON.stringify(currentRoom.messages));
                                  console.log('Saved messages to localStorage for room:', currentRoom.id);
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
                                    // Save messages for the room being closed and clear localStorage
                                    const roomToClose = rooms[tabIndex];
                                    if (roomToClose) {
                                      if (roomToClose.messages.length > 0) {
                                        onSaveMessages(roomToClose.id, roomToClose.messages);
                                      }
                                      // Clear localStorage cache for the closed room
                                      const localStorageKey = `chatMessages-${roomToClose.id}`;
                                      localStorage.removeItem(localStorageKey);
                                      console.log('Cleared localStorage cache for closed room:', roomToClose.id);
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
                    <div className="flex-1 overflow-hidden">
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
            <span className={cn("font-medium", user?.isMerchant && "text-purple-500")}>
              {(rooms && rooms[safeActiveRoomIndex] && rooms[safeActiveRoomIndex].name) || 'No Room'}
              {user?.isMerchant && <Crown className="w-3 h-3 inline-block ml-1 text-purple-500" />}
            </span>
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