
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Search, MessageCircle, Plus, Users } from "lucide-react";
import Lottie from "react-lottie-player";

interface Conversation {
  id: string;
  username: string;
  level: number;
  isOnline: boolean;
  status: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface DMConversationsListProps {
  onSelectUser: (user: {
    id: string;
    username: string;
    level: number;
    status: string;
    isOnline: boolean;
  }) => void;
}

export function DMConversationsList({ onSelectUser }: DMConversationsListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv =>
        conv.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages/conversations', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        console.error('Failed to load conversations');
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-green-500';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Direct Messages</h3>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4">
                <Lottie
                  loop
                  animationData={{
                    "v": "5.7.4",
                    "fr": 60,
                    "ip": 0,
                    "op": 180,
                    "w": 100,
                    "h": 100,
                    "nm": "Loading Animation",
                    "ddd": 0,
                    "assets": [],
                    "layers": [
                      {
                        "ddd": 0,
                        "ind": 1,
                        "ty": 4,
                        "nm": "circle1",
                        "sr": 1,
                        "ks": {
                          "o": {"a": 1, "k": [
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [100]},
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 60, "s": [30]},
                            {"t": 120, "s": [100]}
                          ]},
                          "r": {"a": 0, "k": 0},
                          "p": {"a": 0, "k": [30, 50, 0]},
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
                                "ty": "el",
                                "d": 1,
                                "s": {"a": 0, "k": [8, 8]},
                                "p": {"a": 0, "k": [0, 0]}
                              },
                              {
                                "ty": "fl",
                                "c": {"a": 0, "k": [0.3, 0.6, 1, 1]},
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
                      },
                      {
                        "ddd": 0,
                        "ind": 2,
                        "ty": 4,
                        "nm": "circle2",
                        "sr": 1,
                        "ks": {
                          "o": {"a": 1, "k": [
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 20, "s": [100]},
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 80, "s": [30]},
                            {"t": 140, "s": [100]}
                          ]},
                          "r": {"a": 0, "k": 0},
                          "p": {"a": 0, "k": [50, 50, 0]},
                          "a": {"a": 0, "k": [0, 0, 0]},
                          "s": {"a": 1, "k": [
                            {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 20, "s": [100, 100, 100]},
                            {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 80, "s": [120, 120, 100]},
                            {"t": 140, "s": [100, 100, 100]}
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
                                "c": {"a": 0, "k": [0.3, 0.6, 1, 1]},
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
                      },
                      {
                        "ddd": 0,
                        "ind": 3,
                        "ty": 4,
                        "nm": "circle3",
                        "sr": 1,
                        "ks": {
                          "o": {"a": 1, "k": [
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 40, "s": [100]},
                            {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 100, "s": [30]},
                            {"t": 160, "s": [100]}
                          ]},
                          "r": {"a": 0, "k": 0},
                          "p": {"a": 0, "k": [70, 50, 0]},
                          "a": {"a": 0, "k": [0, 0, 0]},
                          "s": {"a": 1, "k": [
                            {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 40, "s": [100, 100, 100]},
                            {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 100, "s": [120, 120, 100]},
                            {"t": 160, "s": [100, 100, 100]}
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
                                "c": {"a": 0, "k": [0.3, 0.6, 1, 1]},
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
                  }}
                  play
                  style={{ width: 80, height: 80 }}
                />
              </div>
              <div className="text-gray-500">Loading conversations...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Direct Messages</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary p-2"
            onClick={() => setShowNewChat(!showNewChat)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200 rounded-lg"
          />
        </div>

        {/* Conversations List */}
        {filteredConversations.length > 0 ? (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 bg-white hover:bg-gray-50"
                onClick={() => onSelectUser({
                  id: conversation.id,
                  username: conversation.username,
                  level: conversation.level,
                  status: conversation.status,
                  isOnline: conversation.isOnline,
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <UserAvatar 
                        username={conversation.username} 
                        size="md"
                        isOnline={conversation.isOnline}
                      />
                      {/* Status indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />
                      
                      {/* Unread count badge */}
                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Conversation details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-800 truncate">{conversation.username}</span>
                        <Badge variant="secondary" className="bg-primary text-white text-xs px-1.5 py-0.5">
                          {conversation.level}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      
                      {/* Online status text */}
                      <div className="flex items-center space-x-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(conversation.status)}`} />
                        <span className="text-xs text-gray-500 capitalize">{conversation.status || 'offline'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              {!searchQuery ? (
                <div className="mb-4">
                  <Lottie
                    loop
                    animationData={{
                      "v": "5.7.4",
                      "fr": 30,
                      "ip": 0,
                      "op": 120,
                      "w": 150,
                      "h": 150,
                      "nm": "Message Animation",
                      "ddd": 0,
                      "assets": [],
                      "layers": [
                        {
                          "ddd": 0,
                          "ind": 1,
                          "ty": 4,
                          "nm": "message",
                          "sr": 1,
                          "ks": {
                            "o": {"a": 0, "k": 100},
                            "r": {"a": 1, "k": [
                              {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                              {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 60, "s": [10]},
                              {"t": 120, "s": [0]}
                            ]},
                            "p": {"a": 0, "k": [75, 75, 0]},
                            "a": {"a": 0, "k": [0, 0, 0]},
                            "s": {"a": 1, "k": [
                              {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 0, "s": [100, 100, 100]},
                              {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 30, "s": [110, 110, 100]},
                              {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 60, "s": [100, 100, 100]},
                              {"i": {"x": [0.667, 0.667, 0.667], "y": [1, 1, 1]}, "o": {"x": [0.333, 0.333, 0.333], "y": [0, 0, 0]}, "t": 90, "s": [110, 110, 100]},
                              {"t": 120, "s": [100, 100, 100]}
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
                                  "s": {"a": 0, "k": [60, 40]},
                                  "p": {"a": 0, "k": [0, 0]},
                                  "r": {"a": 0, "k": 8}
                                },
                                {
                                  "ty": "fl",
                                  "c": {"a": 0, "k": [0.3, 0.6, 1, 1]},
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
                        },
                        {
                          "ddd": 0,
                          "ind": 2,
                          "ty": 4,
                          "nm": "dots",
                          "sr": 1,
                          "ks": {
                            "o": {"a": 1, "k": [
                              {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
                              {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 30, "s": [100]},
                              {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 90, "s": [100]},
                              {"t": 120, "s": [0]}
                            ]},
                            "r": {"a": 0, "k": 0},
                            "p": {"a": 0, "k": [75, 75, 0]},
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
                                  "s": {"a": 0, "k": [4, 4]},
                                  "p": {"a": 0, "k": [-12, 0]}
                                },
                                {
                                  "ty": "fl",
                                  "c": {"a": 0, "k": [1, 1, 1, 1]},
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
                                  "s": {"a": 0, "k": [4, 4]},
                                  "p": {"a": 0, "k": [0, 0]}
                                },
                                {
                                  "ty": "fl",
                                  "c": {"a": 0, "k": [1, 1, 1, 1]},
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
                                  "s": {"a": 0, "k": [4, 4]},
                                  "p": {"a": 0, "k": [12, 0]}
                                },
                                {
                                  "ty": "fl",
                                  "c": {"a": 0, "k": [1, 1, 1, 1]},
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
                    }}
                    play
                    style={{ width: 120, height: 120 }}
                  />
                </div>
              ) : (
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              )}
              <div className="text-gray-500 mb-2 font-medium">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </div>
              <div className="text-sm text-gray-400 mb-4">
                {searchQuery 
                  ? `No results for "${searchQuery}"`
                  : 'Send a message to start chatting!'
                }
              </div>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                  onClick={() => setShowNewChat(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quick stats */}
        {filteredConversations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{filteredConversations.filter(c => c.isOnline).length} online</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
