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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { notifications, unreadCount: notificationUnreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const today = startOfDay(new Date());

  // Get overdue POs (past due vendor payments not marked as paid)
  const overduePOs = vendors.filter(vendor => {
    if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
    const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
    return isBefore(paymentDate, today);
  });

  // Get overdue income (past due income not yet received)
  const overdueIncome = incomeItems.filter(income => {
    if (income.status === 'received') return false;
    const paymentDate = startOfDay(new Date(income.paymentDate));
    return isBefore(paymentDate, today);
  });

  // Get pending POs (due today only, not yet paid)
  const pendingPOs = vendors.filter(vendor => {
    if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
    const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
    return paymentDate.getTime() === today.getTime();
  });

  // Get pending income (due today only, not yet received)
  const pendingIncome = incomeItems.filter(income => {
    if (income.status === 'received') return false;
    const paymentDate = startOfDay(new Date(income.paymentDate));
    return paymentDate.getTime() === today.getTime();
  });

  const totalOverdue = overduePOs.length + overdueIncome.length;
  const totalPending = pendingPOs.length + pendingIncome.length;
  const transactionNotifications = totalOverdue + totalPending;
  const totalNotifications = transactionNotifications + notificationUnreadCount;

  const totalOverdueAmount = 
    overduePOs.reduce((sum, v) => sum + v.nextPaymentAmount, 0) +
    overdueIncome.reduce((sum, i) => sum + i.amount, 0);

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
          {totalNotifications > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[450px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {totalNotifications > 0 && (
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
        </SheetHeader>
        
        <Tabs defaultValue="transactions" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions" className="relative">
              Transactions
              {transactionNotifications > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-primary text-primary-foreground">
                  {transactionNotifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="relative">
              History
              {notificationUnreadCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-primary text-primary-foreground">
                  {notificationUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {transactionNotifications === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No pending transactions</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overdue Summary */}
                  {totalOverdue > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-red-900 dark:text-red-100">Total Overdue</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{totalOverdue} transaction{totalOverdue > 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          ${totalOverdueAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Overdue POs Section */}
                  {overduePOs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm text-red-600">Overdue Purchase Orders</h3>
                        <Badge variant="destructive">{overduePOs.length}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {overduePOs.map(vendor => (
                          <div
                            key={vendor.id}
                            className="border border-red-200 dark:border-red-800 rounded-lg p-3 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            onClick={() => {
                              onVendorClick?.(vendor);
                              setIsOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{vendor.name}</p>
                                {vendor.poName && (
                                  <p className="text-xs text-muted-foreground">{vendor.poName}</p>
                                )}
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  Due: {format(new Date(vendor.nextPaymentDate), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm text-finance-negative">
                                  -${vendor.nextPaymentAmount.toLocaleString()}
                                </p>
                                <Badge variant="destructive" className="text-[10px] mt-1">
                                  {Math.abs(Math.floor((today.getTime() - new Date(vendor.nextPaymentDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue Income Section */}
                  {overdueIncome.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm text-red-600">Overdue Income</h3>
                        <Badge variant="destructive">{overdueIncome.length}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {overdueIncome.map(income => (
                          <div
                            key={income.id}
                            className="border border-red-200 dark:border-red-800 rounded-lg p-3 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            onClick={() => {
                              onIncomeClick?.(income);
                              setIsOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{income.description}</p>
                                <p className="text-xs text-muted-foreground">{income.source}</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  Expected: {format(new Date(income.paymentDate), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm text-finance-positive">
                                  +${income.amount.toLocaleString()}
                                </p>
                                <Badge variant="destructive" className="text-[10px] mt-1">
                                  {Math.abs(Math.floor((today.getTime() - new Date(income.paymentDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending POs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Pending Purchase Orders</h3>
                      <Badge variant="secondary">{pendingPOs.length}</Badge>
                    </div>
                    
                    {pendingPOs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending purchase orders</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingPOs.map(vendor => (
                          <div
                            key={vendor.id}
                            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              onVendorClick?.(vendor);
                              setIsOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{vendor.name}</p>
                                {vendor.poName && (
                                  <p className="text-xs text-muted-foreground">{vendor.poName}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {format(new Date(vendor.nextPaymentDate), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm text-finance-negative">
                                  -${vendor.nextPaymentAmount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pending Income Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Pending Income</h3>
                      <Badge variant="secondary">{pendingIncome.length}</Badge>
                    </div>
                    
                    {pendingIncome.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending income</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingIncome.map(income => (
                          <div
                            key={income.id}
                            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              onIncomeClick?.(income);
                              setIsOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{income.description}</p>
                                <p className="text-xs text-muted-foreground">{income.source}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expected: {format(new Date(income.paymentDate), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm text-finance-positive">
                                  +${income.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No notification history</p>
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
                          <p className="text-lg font-bold mb-2">
                            ${Math.abs(notification.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span className="capitalize">{notification.category}</span>
                          <span>{format(notification.date, 'MMM d, h:mm a')}</span>
                        </div>

                        {notification.dueDate && (
                          <div className="text-xs mt-1 opacity-70">
                            Due: {format(notification.dueDate, 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
