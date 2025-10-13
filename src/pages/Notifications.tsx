import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { Bell, BellOff, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Notifications = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeNotifications: 0,
    totalConfigured: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('enabled, notification_type')
        .eq('user_id', user!.id);

      if (error) throw error;

      console.log('Notification preferences:', data); // Debug log
      
      const enabledCount = data?.filter(p => p.enabled === true).length || 0;
      
      setStats({
        activeNotifications: enabledCount,
        totalConfigured: 5, // Total number of notification types available
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Automated Notifications
        </h1>
        <p className="text-muted-foreground">
          Configure smart notifications to stay on top of your cash flow automatically
        </p>
      </div>

      {stats.totalConfigured > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Alerts
                </CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{stats.activeNotifications}</div>
                <div className="text-sm text-muted-foreground">
                  / {stats.totalConfigured} configured
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Notification Types
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Balance</Badge>
                <Badge variant="secondary">Payments</Badge>
                <Badge variant="secondary">Income</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Automation Status
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats.activeNotifications > 0 ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">Running</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No active alerts</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <NotificationSettings onUpdate={fetchStats} />
    </div>
  );
};

export default Notifications;
