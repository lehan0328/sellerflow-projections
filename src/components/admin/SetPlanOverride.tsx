import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Shield, Search, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PLAN_LIMITS, getPlanDefault, getAccountStatus, formatPlanName } from "@/lib/adminUtils";

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
  const [maxBankConnections, setMaxBankConnections] = useState<string>("");
  const [maxTeamMembers, setMaxTeamMembers] = useState<string>("");
  const [selectedUserData, setSelectedUserData] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  
  // Admin invitation states
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"admin" | "staff">("admin");
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const fetchAuditLogs = async (userId?: string) => {
    setLoadingAuditLogs(true);
    try {
      let query = supabase
        .from('plan_override_audit')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.limit(50); // Show last 50 changes when no user selected
      }

      const { data, error } = await query;

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    fetchAdminPermissions();
    fetchAuditLogs(); // Load recent changes on mount
  }, []);

  const handleLookupUser = async () => {
    if (!userEmail) {
      toast.error("Please enter an email address");
      return;
    }
    
    setLookingUp(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, plan_override, plan_override_reason, plan_tier, account_status, trial_end, max_bank_connections, max_team_members, stripe_customer_id')
        .eq('email', userEmail.toLowerCase())
        .single();
        
      if (error) throw error;
      
      if (!profileData) {
        toast.error("User not found");
        return;
      }
      
      setSelectedUserData(profileData);
      setPlanTier(profileData.plan_override || profileData.plan_tier || "");
      setMaxBankConnections(profileData.max_bank_connections?.toString() || "");
      setMaxTeamMembers(profileData.max_team_members?.toString() || "");
      toast.success(`Found user: ${profileData.first_name || ''} ${profileData.last_name || ''}`);
      
      // Fetch audit logs for this user
      fetchAuditLogs(profileData.user_id);
    } catch (error: any) {
      console.error("Error looking up user:", error);
      toast.error(error.message || "User not found");
      setSelectedUserData(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSetOverride = async () => {
    if (!userEmail || !planTier) {
      toast.error("Please provide both email and plan tier");
      return;
    }

    if (!reason || reason.trim() === '') {
      toast.error("Reason is required for all plan override changes");
      return;
    }

    const oldPlanTier = selectedUserData?.plan_override || selectedUserData?.plan_tier;
    const oldBankConnections = selectedUserData?.max_bank_connections;
    const oldTeamMembers = selectedUserData?.max_team_members;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-plan-override', {
        body: {
          userEmail,
          planTier,
          reason: reason.trim(),
          maxBankConnections: maxBankConnections ? parseInt(maxBankConnections) : null,
          maxTeamMembers: maxTeamMembers ? parseInt(maxTeamMembers) : null
        }
      });

      if (error) throw error;

      let changeDetails = `Updated ${userEmail}:`;
      if (oldPlanTier !== planTier) changeDetails += ` Plan: ${oldPlanTier || 'none'} → ${planTier}`;
      if (oldBankConnections?.toString() !== maxBankConnections) changeDetails += ` | Bank Connections: ${oldBankConnections || 'default'} → ${maxBankConnections || 'default'}`;
      if (oldTeamMembers?.toString() !== maxTeamMembers) changeDetails += ` | Team Members: ${oldTeamMembers || 'default'} → ${maxTeamMembers || 'default'}`;

      toast.success(changeDetails);
      setUserEmail("");
      setPlanTier("");
      setReason("");
      setMaxBankConnections("");
      setMaxTeamMembers("");
      setSelectedUserData(null);
      
      // Refresh audit logs
      fetchAuditLogs();
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
        .rpc('get_all_admin_permissions');

      if (error) throw error;
      setAdminPermissions(data || []);
    } catch (error: any) {
      console.error("Error fetching admin permissions:", error);
      toast.error("Failed to load admin permissions");
    } finally {
      setLoadingAdmins(false);
    }
  };

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
        {/* Set for any user */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Set for Any User</h3>
          <div className="space-y-2">
            <Label>User Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setSelectedUserData(null);
                }}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button 
                onClick={handleLookupUser}
                disabled={lookingUp || !userEmail}
                variant="outline"
              >
                {lookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {selectedUserData && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">
                    {selectedUserData.first_name || ''} {selectedUserData.last_name || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan Tier:</span>
                  <Badge variant="secondary">
                    {selectedUserData.plan_override || selectedUserData.plan_tier || 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getAccountStatus(selectedUserData).variant}>
                    {getAccountStatus(selectedUserData).label}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Bank Connections:</span>
                  <span className="font-medium">
                    {selectedUserData.max_bank_connections || 
                     getPlanDefault(selectedUserData.plan_override || selectedUserData.plan_tier, 'bank')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Team Members:</span>
                  <span className="font-medium">
                    {selectedUserData.max_team_members || 
                     getPlanDefault(selectedUserData.plan_override || selectedUserData.plan_tier, 'team')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

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
                <SelectItem value="tier1">Enterprise 1 ($100k-$250k)</SelectItem>
                <SelectItem value="tier2">Enterprise 2 ($250k-$500k)</SelectItem>
                <SelectItem value="tier3">Enterprise 3 ($500k+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Max Bank Connections (optional)</Label>
            <Input
              type="number"
              value={maxBankConnections}
              onChange={(e) => setMaxBankConnections(e.target.value)}
              placeholder="Leave empty for plan default"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Max Team Members (optional)</Label>
            <Input
              type="number"
              value={maxTeamMembers}
              onChange={(e) => setMaxTeamMembers(e.target.value)}
              placeholder="Leave empty for plan default"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this override being set? (Required)"
              required
            />
          </div>
          <Button 
            onClick={handleSetOverride} 
            disabled={loading || !userEmail || !planTier || !reason.trim()}
            variant="secondary"
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set Plan Override
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Audit Log Dialog */}
    <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          View Plan Override Change Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Override Change Log</DialogTitle>
          <DialogDescription>
            Complete history of plan override changes (read-only)
          </DialogDescription>
        </DialogHeader>
        {loadingAuditLogs ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No plan override changes found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Old Plan</TableHead>
                  <TableHead>New Plan</TableHead>
                  <TableHead>Bank Connections</TableHead>
                  <TableHead>Team Members</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.user_email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.changed_by_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.old_plan_tier || 'None'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-xs">
                        {log.new_plan_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.old_max_bank_connections ?? '-'} → {log.new_max_bank_connections ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.old_max_team_members ?? '-'} → {log.new_max_team_members ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </div>
  );
};
