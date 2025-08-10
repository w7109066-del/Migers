
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './use-auth';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_request_received' | 'friend_accepted' | 'friend_request_accepted' | 'gift_received' | 'credit_received' | 'credit_transfer';
  title: string;
  message: string;
  fromUser?: {
    id: string;
    username: string;
  };
  data?: any;
  isRead: boolean;
  createdAt: string;
  actionRequired?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = async () => {
    // Update local state immediately
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    
    // Sync with server if needed
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        console.warn('Failed to sync mark all read with server');
      }
    } catch (error) {
      console.warn('Failed to sync mark all read with server:', error);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  // Load initial notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Listen for WebSocket notifications
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_notification' && data.notification) {
          console.log('Received new notification via WebSocket:', data.notification);
          setNotifications(prev => [data.notification, ...prev]);
        }
      } catch (error) {
        // Not a JSON message, ignore
      }
    };

    // Add WebSocket message listener
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleWebSocketMessage);
      
      // Also listen for custom WebSocket events
      const handleNotification = (event: CustomEvent) => {
        if (event.detail && event.detail.type === 'new_notification') {
          console.log('Received notification event:', event.detail);
          setNotifications(prev => [event.detail.notification, ...prev]);
        }
      };
      
      // Listen for friend request notification cleanup
      const handleClearFriendRequests = (event: CustomEvent) => {
        const { fromUserId } = event.detail;
        setNotifications(prev => 
          prev.filter(notif => 
            !(notif.type === 'friend_request_received' && 
              notif.fromUser?.id === fromUserId)
          )
        );
      };
      
      window.addEventListener('websocket-notification', handleNotification as EventListener);
      window.addEventListener('clear-friend-request-notifications', handleClearFriendRequests as EventListener);
      
      return () => {
        window.removeEventListener('message', handleWebSocketMessage);
        window.removeEventListener('websocket-notification', handleNotification as EventListener);
        window.removeEventListener('clear-friend-request-notifications', handleClearFriendRequests as EventListener);
      };
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
