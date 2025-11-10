import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Megaphone, Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminSendUpdate = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "critical">("info");
  const [category, setCategory] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  const handleSendUpdate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-update-notification', {
        body: {
          title: title.trim(),
          message: message.trim(),
          type,
          category: category.trim() || undefined,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Update sent to ${data.count} users successfully!`);
        setLastSent(new Date());
        // Clear form
        setTitle("");
        setMessage("");
        setCategory("");
        setType("info");
      } else {
        throw new Error(data?.error || "Failed to send update");
      }
    } catch (error: any) {
      console.error("Error sending update:", error);
      toast.error(error.message || "Failed to send update notification");
    } finally {
      setIsSending(false);
    }
  };

  const getTypeColor = (notifType: string) => {
    switch (notifType) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
      case 'success':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100';
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Send Update to All Users</CardTitle>
              <CardDescription>
                Create and send a notification that will appear in all users' notification panels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {lastSent && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                Last update sent successfully at {lastSent.toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will send a notification to all users in the system. Make sure your message is clear and actionable.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., New Feature: Amazon Integration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Describe the update in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Notification Type</Label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  placeholder="e.g., feature, maintenance"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <div className={`p-4 rounded-lg border ${getTypeColor(type)}`}>
                <h4 className="font-semibold text-sm mb-1">
                  {title || "Your title here"}
                </h4>
                <p className="text-sm opacity-90">
                  {message || "Your message will appear here"}
                </p>
                {category && (
                  <div className="mt-2">
                    <span className="inline-block text-xs px-2 py-1 rounded border bg-background/50">
                      {category}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleSendUpdate}
              disabled={isSending || !title.trim() || !message.trim()}
              className="w-full"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending to all users...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Update to All Users
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
