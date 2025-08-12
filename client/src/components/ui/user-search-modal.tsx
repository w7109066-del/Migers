import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, Loader2, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Define a UserStatus component to display online/offline status
const UserStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
    {isOnline ? 'Online' : 'Offline'}
  </div>
);

interface User {
  id: string;
  username: string;
  level: number;
  isOnline: boolean;
  status?: string;
  country?: string;
  isAdmin?: boolean; // Added isAdmin property
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
  onMessageClick?: (user: User) => void;
}

export function UserSearchModal({ isOpen, onClose, onUserSelect, onMessageClick }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser, isDarkMode } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 1) return [];

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to search users');
        }

        return response.json();
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: searchQuery.trim().length >= 1,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleAddFriend = async (userId: string, username: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast({
          title: "Friend request sent!",
          description: `Your friend request has been sent to ${username}.`,
        });
        queryClient.invalidateQueries(["/api/friends"]); // Invalidate and refetch friends list
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to send friend request",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast({
        title: "Network error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (user: User) => {
    onUserSelect({
      ...user,
      country: user.country || "ID"
    });
    onClose();
  };

  const handleMessageClick = (user: User) => {
    if (onMessageClick && typeof onMessageClick === 'function') {
      onMessageClick({
        ...user,
        country: user.country || "ID"
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-md h-[600px] p-0", isDarkMode ? "bg-gray-900" : "bg-white")}>
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-4 border-b", isDarkMode ? "border-gray-700" : "border-gray-200")}>
          <button
            onClick={onClose}
            className={cn("text-lg font-normal", isDarkMode ? "text-gray-300" : "text-gray-700")}
          >
            ✕
          </button>
          <h2 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-black")}>
            Search
          </h2>
          <div className="w-6"></div> {/* Spacer for centering */}
        </div>

        {/* Search Input */}
        <div className={cn("px-4 py-2", isDarkMode ? "border-gray-700" : "border-gray-200")}>
          <div className={cn("relative rounded-lg", isDarkMode ? "bg-gray-800" : "bg-gray-100")}>
            <Search className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4", isDarkMode ? "text-gray-400" : "text-gray-500")} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border-0 focus:ring-0 focus:outline-none text-sm",
                isDarkMode ? "bg-gray-800 text-white placeholder:text-gray-400" : "bg-gray-100 text-black placeholder:text-gray-500"
              )}
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && searchQuery.trim().length >= 1 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && searchQuery.trim().length >= 1 && (!searchResults || searchResults.length === 0) && (
            <div className={cn("text-center py-8", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              <p className="text-sm">No users found.</p>
            </div>
          )}

          {searchQuery.trim().length === 0 && (
            <div className={cn("text-center py-8", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Search for users</p>
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className={cn("divide-y", isDarkMode ? "divide-gray-700" : "divide-gray-100")}>
              {searchResults.map((user: User) => (
                <div key={user.id} className={cn("px-4 py-3 hover:bg-gray-50 transition-colors", isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50")}>
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer flex-1"
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {user.profilePhotoUrl ? (
                          <img
                            src={user.profilePhotoUrl}
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <UserAvatar
                            username={user.username}
                            size="md"
                            isOnline={user.isOnline}
                          />
                        )}
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={cn("font-semibold truncate", isDarkMode ? "text-white" : "text-black")}>
                            {user.username}
                          </p>
                          {user.isAdmin && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                          Level {user.level} • {user.isOnline ? "Online" : "Offline"}
                        </p>
                        {user.status && (
                          <p className={cn("text-xs truncate", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                            {user.status}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageClick(user);
                        }}
                        className="p-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFriend(user.id, user.username);
                        }}
                        className="p-2"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}