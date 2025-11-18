import { useState, useMemo } from "react";
import { Bell, X, CheckCheck, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import { useTransactions } from "@/hooks/useTransactions";
import { useIncome } from "@/hooks/useIncome";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { OverdueTransactionsModal } from "./overdue-transactions-modal";

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
  onCreditCardNotificationClick?: (notification: any) => void;
}

export const PendingNotificationsPanel = ({
  vendors,
  incomeItems,
  onVendorClick,
  onIncomeClick,
  onCreditCardNotificationClick,
}: PendingNotificationsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [overdueModalTab, setOverdueModalTab] = useState<'expenses' | 'income' | 'purchaseOrders'>('expenses');
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();
  
  // Fetch overdue data
  const { transactions: expenseTransactions } = useTransactions();
  const { incomeItems: fetchedIncomeItems } = useIncome();
  const { transactions: purchaseOrders } = useVendorTransactions();

  // Calculate overdue items grouped by type
  const overdueGroups = useMemo(() => {
    const today = startOfDay(new Date());

    // Overdue expenses (not including today's due items - only past due)
    const overdueExpenses = expenseTransactions.filter(tx => 
      tx.type === 'expense' && 
      tx.status === 'pending' && 
      startOfDay(new Date(tx.transactionDate)) < today
    );

    // Overdue income (not including today's due items - only past due)
    const overdueIncome = fetchedIncomeItems.filter(inc => 
      inc.status === 'pending' && 
      startOfDay(new Date(inc.paymentDate)) < today
    );

    // Overdue purchase orders (not including today's due items - only past due)
    const overduePOs = purchaseOrders.filter(po => 
      po.status === 'pending' && 
      po.dueDate &&
      startOfDay(new Date(po.dueDate)) < today
    );

    return {
      expenses: overdueExpenses,
      income: overdueIncome,
      purchaseOrders: overduePOs
    };
  }, [expenseTransactions, fetchedIncomeItems, purchaseOrders]);

  // Calculate total overdue count
  const totalOverdueCount = useMemo(() => {
    return overdueGroups.expenses.length + overdueGroups.income.length + overdueGroups.purchaseOrders.length;
  }, [overdueGroups]);

  const totalUnreadCount = unreadCount + totalOverdueCount;

  const handleNotificationClick = (notification: any, read: boolean) => {
    if (!read) {
      markAsRead(notification.id);
    }
    
    // Check if this is a credit card notification
    if (notification.category === 'credit' && onCreditCardNotificationClick) {
      setIsOpen(false);
      onCreditCardNotificationClick(notification);
    }
  };

  const handleClearNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    clearNotification(notificationId);
  };

  const handleViewOverdue = (tab: 'expenses' | 'income' | 'purchaseOrders') => {
    setOverdueModalTab(tab);
    setOverdueModalOpen(true);
    setIsOpen(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
      case 'security':
        return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
      case 'maintenance':
      case 'reminder':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      case 'new_feature':
      case 'bug_fix':
        return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
    }
  };

  const getBadgeTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
      case 'security':
        return 'bg-red-300 text-white border-red-400';
      case 'maintenance':
      case 'reminder':
        return 'bg-amber-300 text-white border-amber-400';
      case 'new_feature':
        return 'bg-emerald-300 text-white border-emerald-400';
      case 'bug_fix':
        return 'bg-green-300 text-white border-green-400';
      case 'announcement':
        return 'bg-purple-300 text-white border-purple-400';
      case 'legal_policy':
        return 'bg-slate-300 text-white border-slate-400';
      case 'info':
        return 'bg-sky-300 text-white border-sky-400';
      default:
        return 'bg-blue-300 text-white border-blue-400';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'credit':
        return 'bg-orange-300 text-white border-orange-400';
      case 'payment':
        return 'bg-teal-300 text-white border-teal-400';
      case 'account':
        return 'bg-indigo-300 text-white border-indigo-400';
      case 'support':
        return 'bg-purple-300 text-white border-purple-400';
      default:
        return 'bg-pink-300 text-white border-pink-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'update':
        return '🔄 Update';
      case 'announcement':
        return '📢 Announcement';
      case 'maintenance':
        return '🔧 Maintenance';
      case 'new_feature':
        return '✨ New Feature';
      case 'bug_fix':
        return '🐛 Bug Fix';
      case 'urgent':
        return '🚨 Urgent';
      case 'legal_policy':
        return '📋 Legal/Policy Update';
      case 'reminder':
        return '⏰ Reminder';
      case 'security':
        return '🔒 Security';
      case 'info':
        return 'ℹ️ Info';
      default:
        return type;
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[450px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <div className="flex gap-2">
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
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <SheetDescription>
            View your notification history and overdue items
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6">
              {/* Overdue Action Tabs */}
              {totalOverdueCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">Overdue Items - Action Required</h3>
                  
                  {/* Overdue Expenses */}
                  {overdueGroups.expenses.length > 0 && (
                    <div className="p-4 rounded-lg border bg-red-500/5 border-red-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-red-500 text-white">
                            {overdueGroups.expenses.length}
                          </Badge>
                          <div>
                            <p className="font-semibold text-sm">Overdue Expenses</p>
                            <p className="text-xs text-muted-foreground">
                              ${overdueGroups.expenses.reduce((sum, exp) => sum + Math.abs(exp.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOverdue('expenses')}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View & Manage
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Overdue Income */}
                  {overdueGroups.income.length > 0 && (
                    <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-amber-500 text-white">
                            {overdueGroups.income.length}
                          </Badge>
                          <div>
                            <p className="font-semibold text-sm">Overdue Income</p>
                            <p className="text-xs text-muted-foreground">
                              ${overdueGroups.income.reduce((sum, inc) => sum + Math.abs(inc.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} expected
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOverdue('income')}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View & Manage
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Overdue Purchase Orders */}
                  {overdueGroups.purchaseOrders.length > 0 && (
                    <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-orange-500 text-white">
                            {overdueGroups.purchaseOrders.length}
                          </Badge>
                          <div>
                            <p className="font-semibold text-sm">Overdue Purchase Orders</p>
                            <p className="text-xs text-muted-foreground">
                              ${overdueGroups.purchaseOrders.reduce((sum, po) => sum + Math.abs(po.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOverdue('purchaseOrders')}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View & Manage
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regular Notifications */}
              {notifications.length === 0 && totalOverdueCount === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No notifications</p>
                </div>
              ) : notifications.length > 0 && (
                <div className="space-y-3">
                  {totalOverdueCount > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground px-1">Other Notifications</h3>
                  )}
                  {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification, notification.read)}
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

                    <div className="pr-8 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={cn("text-xs font-medium border whitespace-nowrap shrink-0", getBadgeTypeColor(notification.type))}>
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {notification.category && (
                          <Badge className={cn("text-xs font-medium border capitalize whitespace-nowrap shrink-0", getCategoryColor(notification.category))}>
                            {notification.category}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-sm break-words">{notification.title}</h4>
                      </div>
                      
                      <p className="text-sm opacity-90 mb-2 break-words">
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
                      
                      {notification.actionUrl && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notification.read) {
                                markAsRead(notification.id);
                              }
                              window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            {notification.actionLabel || 'View Details'}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>

    {/* Overdue Transactions Modal */}
    <OverdueTransactionsModal
      open={overdueModalOpen}
      onOpenChange={setOverdueModalOpen}
      initialTab={overdueModalTab}
    />
    </>
  );
};
