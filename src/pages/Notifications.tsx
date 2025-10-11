import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, Check, CheckCheck, AlertCircle, AlertTriangle, Info, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getCategoryBadge = (category: string): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      payment: 'default',
      income: 'secondary',
      'cash-flow': 'outline',
      amazon: 'default',
      bank: 'secondary',
      credit: 'destructive'
    };
    return variants[category] || 'default';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your financial activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {unreadCount} Unread
          </Badge>
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {notifications.filter(n => n.type === 'critical').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {notifications.filter(n => n.type === 'warning').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actionable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {notifications.filter(n => n.actionable).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>Real-time financial notifications and alerts</CardDescription>
            </div>
            {notifications.length === 0 && (
              <BellOff className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">You have no notifications at this time.</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <div 
                      className={`p-4 rounded-lg border transition-all ${getTypeColor(notification.type)} ${
                        notification.read ? 'opacity-60' : 'shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{notification.title}</h3>
                                <Badge variant={getCategoryBadge(notification.category)}>
                                  {notification.category}
                                </Badge>
                                {notification.priority === 'high' && (
                                  <Badge variant="destructive" className="text-xs">HIGH</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                            </div>
                            
                            <div className="text-right flex-shrink-0">
                              {notification.amount && (
                                <div className="text-lg font-bold">
                                  ${notification.amount.toLocaleString()}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {format(notification.date, 'MMM dd, h:mm a')}
                              </div>
                            </div>
                          </div>
                          
                          {notification.dueDate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {format(notification.dueDate, 'MMM dd, yyyy')}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            
                            {notification.actionable && (
                              <Button variant="default" size="sm">
                                {notification.actionLabel}
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearNotification(notification.id)}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < notifications.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
