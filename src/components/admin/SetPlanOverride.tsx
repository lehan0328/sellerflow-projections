import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const SetPlanOverride = () => {
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState("");
  const [planTier, setPlanTier] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetOverride = async () => {
    if (!userEmail || !planTier) {
      toast.error("Please provide both email and plan tier");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-plan-override', {
        body: {
          userEmail,
          planTier,
          reason: reason || `Plan override set to ${planTier}`
        }
      });

      if (error) throw error;

      toast.success(data.message || "Plan override set successfully");
      setUserEmail("");
      setPlanTier("");
      setReason("");
    } catch (error: any) {
      console.error("Error setting plan override:", error);
      toast.error(error.message || "Failed to set plan override");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentUser = async () => {
    if (!user?.email) {
      toast.error("No user logged in");
      return;
    }

    if (!planTier) {
      toast.error("Please select a plan tier");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-plan-override', {
        body: {
          userEmail: user.email,
          planTier,
          reason: reason || `Self-assigned ${planTier} plan`
        }
      });

      if (error) throw error;

      toast.success(data.message || "Plan override set successfully");
      setPlanTier("");
      setReason("");
    } catch (error: any) {
      console.error("Error setting plan override:", error);
      toast.error(error.message || "Failed to set plan override");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Override Management</CardTitle>
        <CardDescription>
          Set or remove plan overrides for users (admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick set for current user */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold">Quick Set for Current User</h3>
          <p className="text-sm text-muted-foreground">
            Currently logged in as: <strong>{user?.email}</strong>
          </p>
          <div className="space-y-2">
            <Label>Plan Tier</Label>
            <Select value={planTier} onValueChange={setPlanTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this override being set?"
            />
          </div>
          <Button 
            onClick={handleSetCurrentUser} 
            disabled={loading || !planTier}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set {planTier || "Plan"} for Current Account
          </Button>
        </div>

        {/* Set for any user */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Set for Any User</h3>
          <div className="space-y-2">
            <Label>User Email</Label>
            <Input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Plan Tier</Label>
            <Select value={planTier} onValueChange={setPlanTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this override being set?"
            />
          </div>
          <Button 
            onClick={handleSetOverride} 
            disabled={loading || !userEmail || !planTier}
            variant="secondary"
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set Plan Override
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
