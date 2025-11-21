import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Mail, Trash2, UserPlus, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { AddonLimitDialog } from "@/components/cash-flow/addon-limit-dialog";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  isAccountOwner: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  invitedBy: string;
  accountCreated: boolean;
}

export function TeamManagement() {
  const { user } = useAuth();
  const { isAdmin: isWebsiteAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<'admin' | 'staff'>('staff');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Get current user's profile
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, account_id, first_name, last_name, is_account_owner, email, max_team_members')
        .eq('user_id', user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user can manage team
  const canManageTeam = isWebsiteAdmin || currentProfile?.is_account_owner;

  // Fetch team members with a single joined query
  const { data: teamMembers = [], isLoading: loadingMembers, error: membersError } = useQuery<TeamMember[]>({
    queryKey: ['team-members', currentProfile?.account_id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!currentProfile?.account_id) return [];

      // Get all profiles in the account with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, is_account_owner, email, account_id')
        .eq('account_id', currentProfile.account_id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.user_id);

      // Get roles for all users in this account
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('account_id', currentProfile.account_id)
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Get emails from auth.users
      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      // Combine data
      const members: TeamMember[] = profiles.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        
        // Determine role: owner if is_account_owner, otherwise use user_roles table
        const role = profile.is_account_owner 
          ? 'owner' 
          : (userRole?.role as 'admin' | 'staff') || 'staff';

        return {
          userId: profile.user_id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: emailData?.emails?.[profile.user_id] || profile.email || 'Unknown',
          role,
          isAccountOwner: profile.is_account_owner || false
        };
      });

      // Sort: owner first, then alphabetically by name
      return members.sort((a, b) => {
        if (a.isAccountOwner) return -1;
        if (b.isAccountOwner) return 1;
        const nameA = `${a.firstName} ${a.lastName}`.trim();
        const nameB = `${b.firstName} ${b.lastName}`.trim();
        return nameA.localeCompare(nameB);
      });
    },
    enabled: !!currentProfile?.account_id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending invitations
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', currentProfile?.account_id],
    queryFn: async () => {
      if (!currentProfile?.account_id) return [];

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('account_id', currentProfile.account_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      return (data || []).map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedAt: invite.created_at,
        invitedBy: invite.invited_by,
        accountCreated: false
      })) as PendingInvite[];
    },
    enabled: !!currentProfile?.account_id,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate team member limits from profile
  const maxTeamMembers = currentProfile?.max_team_members || 1;
  const currentTeamCount = teamMembers.length;
  const seatsAvailable = maxTeamMembers - currentTeamCount;
  const canAddMembers = seatsAvailable > 0;

  // Send invitation mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email, role }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setInviteEmail("");
      setInviteRole('staff');
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send invitation");
    }
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async ({ email, firstName, lastName, role }: { email: string; firstName: string; lastName: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('create-team-member-account', {
        body: { email, firstName, lastName, role }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Team member account created successfully");
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateRole('staff');
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create account");
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'staff' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('account_id', currentProfile!.account_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member removed successfully");
      setRemovingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove team member");
      setRemovingUserId(null);
    }
  });

  // Cancel invitation mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel invitation");
    }
  });

  const handleSendInvite = () => {
    if (!canAddMembers) {
      setShowLimitDialog(true);
      return;
    }
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleCreateAccount = () => {
    if (!canAddMembers) {
      setShowLimitDialog(true);
      return;
    }
    if (!createEmail || !createFirstName || !createLastName) {
      toast.error("Please fill in all fields");
      return;
    }
    createAccountMutation.mutate({ 
      email: createEmail, 
      firstName: createFirstName, 
      lastName: createLastName, 
      role: createRole 
    });
  };

  if (loadingMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription>Loading team members...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (membersError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription className="text-destructive">
            Error loading team members. Please refresh the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your team members and their access levels
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{currentTeamCount}</span> / <span className="font-medium">{maxTeamMembers}</span> seats used
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Action Buttons */}
          {canManageTeam && (
            <div className="flex gap-2">
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Send Invite Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation email to add a new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value: 'admin' | 'staff') => setInviteRole(value)}>
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendInvite} disabled={sendInviteMutation.isPending}>
                        {sendInviteMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Team Member Account</DialogTitle>
                    <DialogDescription>
                      Directly create an account for a new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email Address</Label>
                      <Input
                        id="create-email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-firstname">First Name</Label>
                        <Input
                          id="create-firstname"
                          placeholder="John"
                          value={createFirstName}
                          onChange={(e) => setCreateFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-lastname">Last Name</Label>
                        <Input
                          id="create-lastname"
                          placeholder="Doe"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-role">Role</Label>
                      <Select value={createRole} onValueChange={(value: 'admin' | 'staff') => setCreateRole(value)}>
                        <SelectTrigger id="create-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
                        {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Team Members List */}
          <div className="space-y-4">
            <h3 className="font-medium">Team Members</h3>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members found.</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <Card key={member.userId}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {member.firstName} {member.lastName}
                            {member.userId === user?.id && <span className="text-muted-foreground ml-2">(You)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {member.role === 'owner' ? 'Account Owner' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </div>

                      {canManageTeam && !member.isAccountOwner && member.userId !== user?.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value: 'admin' | 'staff') => updateRoleMutation.mutate({ userId: member.userId, newRole: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRemovingUserId(member.userId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Pending Invitations</h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited as {invite.role} • {new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {canManageTeam && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInviteMutation.mutate(invite.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removingUserId} onOpenChange={(open) => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this team member's account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingUserId && removeMemberMutation.mutate(removingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Member Limit Dialog */}
      <AddonLimitDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        addonType="user"
        currentUsage={currentTeamCount}
        currentLimit={maxTeamMembers}
      />
    </>
  );
}
