import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AdminPermission {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  invited_at: string;
}

export const SetPlanOverride = () => {
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState("");
  const [planTier, setPlanTier] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Admin invitation states
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"admin" | "staff">("admin");
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);


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

  // Fetch admin permissions
  const fetchAdminPermissions = async () => {
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setAdminPermissions(data || []);
    } catch (error: any) {
      console.error("Error fetching admin permissions:", error);
      toast.error("Failed to load admin permissions");
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Load admin permissions on mount
  useEffect(() => {
    fetchAdminPermissions();
  }, []);

  const handleInviteAdmin = async () => {
    if (!adminEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: adminEmail, role: adminRole }
      });

      if (error) throw error;

      toast.success(`Invitation email sent to ${adminEmail}`);
      setAdminEmail("");
      fetchAdminPermissions();
    } catch (error: any) {
      console.error("Error inviting admin:", error);
      toast.error(error.message || "Failed to invite admin");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Are you sure you want to remove admin access for ${email}?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email, action: 'delete' }
      });

      if (error) throw error;

      toast.success(`Removed admin access for ${email}`);
      fetchAdminPermissions();
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast.error(error.message || "Failed to remove admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Dashboard Access
          </CardTitle>
          <CardDescription>
            Invite users to access the admin dashboard and assign their permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Invite Admin User</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              An email invitation will be sent allowing the user to create their own password and access the admin dashboard
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select value={adminRole} onValueChange={(v) => setAdminRole(v as "admin" | "staff")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="staff">Staff (Support & Features Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleInviteAdmin} 
              disabled={loading || !adminEmail}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Send Invitation Email
            </Button>
          </div>

          {/* Admin List */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Current Admin Users</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Invited users receive an email with a signup link to create their password and access the admin dashboard
              </p>
            </div>
            {loadingAdmins ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : adminPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-8">
                No admin users invited yet
              </p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Invited At</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">{permission.email}</TableCell>
                        <TableCell>
                          <Badge variant={permission.role === 'admin' ? 'default' : 'secondary'}>
                            {permission.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {permission.invited_by || 'System'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(permission.invited_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdmin(permission.email)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Override Management */}
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
    </div>
  );
};
