import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  level: number;
  isOnline: boolean;
  status?: string;
  country?: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
  onMessageClick: (user: User) => void;
}

export function UserSearchModal({ isOpen, onClose, onUserSelect, onMessageClick }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser } = useAuth();
  // Using imported toast function directly
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 2) return [];

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      return response.json();
    },
    enabled: searchQuery.trim().length >= 2,
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
    onMessageClick({
      ...user,
      country: user.country || "ID"
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>

        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder="Search by username..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && searchQuery.trim().length >= 2 && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Searching...</span>
              </div>
            )}

            {!isLoading && searchQuery.trim().length >= 2 && (!searchResults || searchResults.length === 0) && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}

            {searchQuery.trim().length < 2 && (
              <div className="py-6 text-center text-sm text-gray-500">
                Type at least 2 characters to search
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <CommandGroup heading="Users">
                {searchResults.map((user: User) => (
                  <CommandItem key={user.id} className="p-3">
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer flex-1"
                        onClick={() => handleUserClick(user)}
                      >
                        <UserAvatar
                          username={user.username}
                          size="md"
                          isOnline={user.isOnline}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{user.username}</span>
                            <Badge variant="secondary" className="bg-warning text-white text-xs">
                              {user.level}
                            </Badge>
                          </div>
                          <div className={`text-xs ${user.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(user);
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddFriend(user.id, user.username);
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}