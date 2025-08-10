import { useState } from 'react';
import { Bell, X, Check, Gift, CreditCard, UserPlus, Users } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { useNotifications } from '@/hooks/use-notifications';
import { UserAvatar } from '@/components/user/user-avatar';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { useToast } from '@/hooks/use-toast';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const queryClient = useQueryClient(); // Get the query client instance
  const { toast } = useToast(); // Initialize the toast hook

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'friend_accepted':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'gift_received':
        return <Gift className="w-4 h-4 text-purple-500" />;
      case 'credit_received':
      case 'credit_transfer':
        return <CreditCard className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative text-gray-600 p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 sm:w-80 w-screen max-w-sm z-20 max-h-96 overflow-hidden shadow-lg border transform sm:transform-none -translate-x-4 sm:translate-x-0">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">No notifications yet</div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {notification.title}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </div>
                            {notification.fromUser && (
                              <div className="flex items-center space-x-2 mt-2">
                                <UserAvatar
                                  username={notification.fromUser.username}
                                  size="sm"
                                  isOnline={false}
                                />
                                <span className="text-xs text-gray-500">
                                  from {notification.fromUser.username}
                                </span>
                              </div>
                            )}

                            {(notification.type === 'friend_request_received' || notification.type === 'friend_request') && notification.fromUser && (
                              <div className="flex items-center space-x-2 mt-3">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    console.log('=== ACCEPT BUTTON CLICKED ===');
                                    console.log('Notification:', notification);
                                    console.log('From user ID:', notification.fromUser?.id);
                                    
                                    try {
                                      const requestData = { userId: notification.fromUser?.id };
                                      console.log('Sending request with data:', requestData);
                                      
                                      const response = await fetch('/api/friends/accept', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify(requestData),
                                      });
                                      
                                      console.log('Response status:', response.status);
                                      console.log('Response ok:', response.ok);
                                      
                                      const responseData = await response.json();
                                      console.log('Response data:', responseData);
                                      
                                      if (response.ok && responseData.success) {
                                        console.log('Friend request accepted successfully!');
                                        
                                        // Remove the notification immediately
                                        removeNotification(notification.id);
                                        
                                        // Also mark as read in case there are duplicates
                                        markAsRead(notification.id);
                                        
                                        // Force refresh friend list with multiple methods
                                        queryClient.removeQueries({ queryKey: ["/api/friends"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
                                        queryClient.refetchQueries({ queryKey: ["/api/friends"] });
                                        
                                        // Trigger friend list update event
                                        window.dispatchEvent(new CustomEvent('friendListUpdate'));
                                        
                                        toast({
                                          title: "Success!",
                                          description: `Friend request from ${notification.fromUser?.username} accepted`,
                                        });
                                        
                                        // Also trigger a delayed refresh to ensure it works
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('friendListUpdate'));
                                        }, 1000);
                                      } else {
                                        console.error('Failed to accept friend request:', responseData);
                                        toast({
                                          title: "Error",
                                          description: responseData.message || "Failed to accept friend request",
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Network error accepting friend request:', error);
                                      toast({
                                        title: "Error",
                                        description: "Network error. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-xs"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch('/api/friends/reject', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify({ userId: notification.fromUser?.id }),
                                      });
                                      if (response.ok) {
                                        removeNotification(notification.id);
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: "Failed to reject friend request",
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Failed to reject friend request:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to reject friend request",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.createdAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 h-auto text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}