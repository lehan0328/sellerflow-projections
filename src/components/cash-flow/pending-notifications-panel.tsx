import { useState } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isBefore, startOfDay } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: string;
  poName?: string;
}

interface IncomeItem {
  id: string;
  amount: number;
  paymentDate: Date;
  status: 'received' | 'pending' | 'overdue';
  description: string;
  source: string;
}

interface PendingNotificationsPanelProps {
  vendors: Vendor[];
  incomeItems: IncomeItem[];
  onVendorClick?: (vendor: Vendor) => void;
  onIncomeClick?: (income: IncomeItem) => void;
}

export const PendingNotificationsPanel = ({
  vendors,
  incomeItems,
  onVendorClick,
  onIncomeClick,
}: PendingNotificationsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  const handleNotificationClick = (notificationId: string, read: boolean) => {
    if (!read) {
      markAsRead(notificationId);
    }
  };

  const handleClearNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    clearNotification(notificationId);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[450px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>
            View your notification history
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification.read)}
                    className={`
                      relative p-4 rounded-lg border cursor-pointer transition-all
                      ${getTypeColor(notification.type)}
                      ${!notification.read ? 'border-l-4' : 'opacity-70'}
                      hover:shadow-md
                    `}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 hover:bg-background/50"
                      onClick={(e) => handleClearNotification(e, notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>

                    <div className="pr-8">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                      </div>
                      
                      <p className="text-sm opacity-90 mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.amount && (
                        <p className="font-semibold text-base mb-2">
                          ${notification.amount.toLocaleString()}
                        </p>
                      )}
                      
                      {notification.date && (
                        <p className="text-xs opacity-75">
                          {format(new Date(notification.date), 'MMM dd, yyyy')}
                        </p>
                      )}
                      
                      {notification.category && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {notification.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
