import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, DollarSign, Calendar, TrendingUp, Mail, BellOff, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NotificationPreference {
  id: string;
  notification_type: string;
  enabled: boolean;
  schedule_time: string;
  schedule_days: number[];
  threshold_amount?: number;
  advance_days?: number;
  notification_channels: string[];
}

const notificationTypes = [
  {
    type: 'low_balance',
    title: 'Low Balance Alert',
    description: 'Get notified when your cash balance falls below a threshold',
    icon: DollarSign,
    hasThreshold: true,
  },
  {
    type: 'payment_due',
    title: 'Payment Reminders',
    description: 'Reminders for upcoming credit card and vendor payments',
    icon: Calendar,
    hasAdvanceDays: true,
  },
  {
    type: 'income_received',
    title: 'Income Notifications',
    description: 'Get notified when income or Amazon payouts are received',
    icon: TrendingUp,
    hasThreshold: false,
  },
  {
    type: 'daily_summary',
    title: 'Daily Summary',
    description: 'Daily overview of your cash flow activity',
    icon: Clock,
    hasThreshold: false,
  },
  {
    type: 'weekly_summary',
    title: 'Weekly Summary',
    description: 'Weekly recap of income, expenses, and net cash flow',
    icon: Calendar,
    hasThreshold: false,
    weeklyOnly: true,
  },
];

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface NotificationSettingsProps {
  onUpdate?: () => void;
}

export const NotificationSettings = ({ onUpdate }: NotificationSettingsProps = {}) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;

      // Create default preferences for types that don't exist
      const existingTypes = new Set(data?.map(p => p.notification_type) || []);
      const missingTypes = notificationTypes
        .map(nt => nt.type)
        .filter(type => !existingTypes.has(type));

      const defaultPrefs = missingTypes.map(type => ({
        user_id: user!.id,
        notification_type: type,
        enabled: false,
        schedule_time: '09:00:00',
        schedule_days: type === 'weekly_summary' ? [1] : [1, 2, 3, 4, 5],
        threshold_amount: type === 'low_balance' ? 10000 : undefined,
        advance_days: type === 'payment_due' ? 3 : undefined,
        notification_channels: ['in_app'],
      }));

      if (defaultPrefs.length > 0) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select();

        if (insertError) throw insertError;
        
        setPreferences([...(data || []), ...(newData || [])]);
      } else {
        setPreferences(data || []);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (id: string, updates: Partial<NotificationPreference>) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setPreferences(prefs =>
        prefs.map(p => (p.id === id ? { ...p, ...updates } : p))
      );

      toast.success('Notification settings updated');
      
      // Call onUpdate callback to refresh parent stats
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (prefId: string, day: number) => {
    const pref = preferences.find(p => p.id === prefId);
    if (!pref) return;

    const newDays = pref.schedule_days.includes(day)
      ? pref.schedule_days.filter(d => d !== day)
      : [...pref.schedule_days, day].sort();

    updatePreference(prefId, { schedule_days: newDays });
  };

  const toggleChannel = (prefId: string, channel: string) => {
    const pref = preferences.find(p => p.id === prefId);
    if (!pref) return;

    const newChannels = pref.notification_channels.includes(channel)
      ? pref.notification_channels.filter(c => c !== channel)
      : [...pref.notification_channels, channel];

    // Ensure at least one channel is selected
    if (newChannels.length === 0) {
      toast.error('At least one notification channel must be selected');
      return;
    }

    updatePreference(prefId, { notification_channels: newChannels });
  };

  const sendNotificationNow = async (notificationType: string) => {
    try {
      setSending(notificationType);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-automated-notifications', {
        body: { 
          notificationType,
          manual: true 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success(`${notificationType.replace('_', ' ')} notification sent successfully!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Automated Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Configure scheduled notifications to stay on top of your finances
        </p>
      </div>

      <Card className="bg-muted/50 border-muted">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-background rounded-lg">
              <BellOff className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">All notifications are disabled by default</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enable the notifications you want below. Each can be customized with specific schedules and settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {notificationTypes.map(nt => {
          const pref = preferences.find(p => p.notification_type === nt.type);
          if (!pref) return null;

          const Icon = nt.icon;

          return (
            <Card key={nt.type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{nt.title}</CardTitle>
                      <CardDescription>{nt.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={pref.enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(pref.id, { enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>
              </CardHeader>

              {pref.enabled && (
                <CardContent className="space-y-4">
                  {/* Schedule Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={pref.schedule_time.substring(0, 5)}
                        onChange={(e) =>
                          updatePreference(pref.id, {
                            schedule_time: e.target.value + ':00',
                          })
                        }
                        disabled={saving}
                      />
                    </div>

                    {/* Notification Channels */}
                    <div className="space-y-2">
                      <Label>Send via</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${pref.id}-in-app`}
                            checked={pref.notification_channels.includes('in_app')}
                            onCheckedChange={() => toggleChannel(pref.id, 'in_app')}
                            disabled={saving}
                          />
                          <Label htmlFor={`${pref.id}-in-app`} className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Bell className="h-3 w-3" />
                              In-App Notifications
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${pref.id}-email`}
                            checked={pref.notification_channels.includes('email')}
                            onCheckedChange={() => toggleChannel(pref.id, 'email')}
                            disabled={saving}
                          />
                          <Label htmlFor={`${pref.id}-email`} className="font-normal cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              Email Notifications
                            </div>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Days */}
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex gap-2">
                      {dayNames.map((day, idx) => {
                        const dayNum = idx + 1;
                        const isSelected = pref.schedule_days.includes(dayNum);
                        return (
                          <Button
                            key={day}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDay(pref.id, dayNum)}
                            disabled={saving}
                            className="w-12"
                          >
                            {day}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Threshold Amount */}
                  {nt.hasThreshold && (
                    <div className="space-y-2">
                      <Label>Balance Threshold</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          value={pref.threshold_amount || ''}
                          onChange={(e) =>
                            updatePreference(pref.id, {
                              threshold_amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={saving}
                          className="pl-7"
                          placeholder="10000"
                        />
                      </div>
                    </div>
                  )}

                  {/* Advance Days */}
                  {nt.hasAdvanceDays && (
                    <div className="space-y-2">
                      <Label>Days in Advance</Label>
                      <Select
                        value={String(pref.advance_days || 3)}
                        onValueChange={(value) =>
                          updatePreference(pref.id, {
                            advance_days: parseInt(value),
                          })
                        }
                        disabled={saving}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="2">2 days</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="5">5 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Manual Send Button */}
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => sendNotificationNow(nt.type)}
                      disabled={sending === nt.type || saving}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending === nt.type ? 'Sending...' : 'Send Now'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Test this notification by sending it immediately
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Notifications are sent automatically at your chosen times
          </p>
          <p>
            • In-app notifications appear in your Notifications page
          </p>
          <p>
            • Email notifications will be available in a future update
          </p>
          <p>
            • You can enable/disable any notification type at any time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};