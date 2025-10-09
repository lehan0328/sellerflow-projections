import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash2, Shield, Users, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff';
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  email?: string; // Fetched separately
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export function TeamManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSending, setIsSending] = useState(false);

  // Fetch user's profile to get account_id and role
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_id, max_team_members, plan_override, company')
        .eq('user_id', user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id, profile?.account_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('account_id', profile!.account_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!profile?.account_id,
  });

  const isAdmin = userRole?.role === 'owner' || userRole?.role === 'admin';

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', profile?.account_id],
    queryFn: async () => {
      // First get all user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('account_id', profile!.account_id);
      
      if (rolesError) throw rolesError;

      // Then get profiles for each user
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError} = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;

      // Get emails from auth.users via edge function
      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      // Combine the data
      return roles.map(role => ({
        ...role,
        profiles: profiles?.find(p => p.user_id === role.user_id) || {
          first_name: '',
          last_name: ''
        },
        email: emailData?.emails?.[role.user_id] || 'Unknown'
      })) as TeamMember[];
    },
    enabled: !!profile?.account_id,
  });

  // Calculate seats based on subscription plan (after teamMembers is loaded)
  const calculateTotalSeats = () => {
    // Always prioritize max_team_members from profile
    if (profile?.max_team_members) {
      return profile.max_team_members;
    }
    // Fallback to plan override
    if (profile?.plan_override) {
      const planName = profile.plan_override.toLowerCase();
      if (planName.includes('starter')) return 1;
      if (planName.includes('growing')) return 3;
      if (planName.includes('professional')) return 5;
      if (planName.includes('enterprise')) return 8;
    }
    // Default to 1 if nothing is set
    return 1;
  };
  
  const totalSeats = calculateTotalSeats();
  const usedSeats = teamMembers?.length || 0;
  const availableSeats = Math.max(0, totalSeats - usedSeats);

  // Fetch pending invitations
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', profile?.account_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('account_id', profile!.account_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      return data as PendingInvite[];
    },
    enabled: !!profile?.account_id && isAdmin,
  });

  // Send invitation mutation
  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (availableSeats <= 0) {
        throw new Error('No available seats. Please upgrade your plan.');
      }

      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email: inviteEmail, role: inviteRole },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole('staff');
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  // Create account directly
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.email || !createForm.firstName || !createForm.lastName || !createForm.password || !profile?.account_id) {
        throw new Error('Please fill in all fields');
      }

      if (createForm.password !== createForm.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (createForm.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (availableSeats <= 0) {
        throw new Error('No available seats. Please upgrade your plan.');
      }

      // Create the user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            first_name: createForm.firstName,
            last_name: createForm.lastName,
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Failed to create user');

      // Update the user's profile with account_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          account_id: profile.account_id,
          is_account_owner: false 
        })
        .eq('user_id', signUpData.user.id);

      if (profileError) throw profileError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: signUpData.user.id,
          account_id: profile.account_id,
          role: inviteRole
        });

      if (roleError) throw roleError;

      return { firstName: createForm.firstName, lastName: createForm.lastName };
    },
    onSuccess: (data) => {
      toast.success(`Account created successfully for ${data.firstName} ${data.lastName}!`);
      setShowCreateDialog(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setInviteRole('staff');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create account');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'staff' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('account_id', profile!.account_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', profile!.account_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Team member removed');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove team member');
    },
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
      toast.success('Invitation cancelled');
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage team members and their permissions for {profile?.company || 'your account'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <Users className="inline h-3 w-3 mr-1" />
            {usedSeats} / {totalSeats} seats used
            {availableSeats <= 0 && <span className="ml-2 text-amber-600">• Upgrade for more seats</span>}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={availableSeats <= 0}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite Email
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'admin' | 'staff') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff - View and edit data</SelectItem>
                      <SelectItem value="admin">Admin - Manage team and settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => sendInviteMutation.mutate()}
                  disabled={!inviteEmail || sendInviteMutation.isPending}
                >
                  {sendInviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button disabled={availableSeats <= 0}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account for {profile?.company || 'Your Team'}</DialogTitle>
                <DialogDescription>
                  Create a new team member account directly
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    placeholder="John"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    placeholder="Doe"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'admin' | 'staff') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createAccountMutation.mutate()} disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* Current Team Members */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.profiles.first_name && member.profiles.last_name 
                    ? `${member.profiles.first_name} ${member.profiles.last_name}`
                    : member.email
                  }
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {isAdmin && member.role !== 'owner' ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateRoleMutation.mutate({ userId: member.user_id, newRole: value as 'admin' | 'staff' })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role === 'owner' && <Shield className="mr-1 h-3 w-3" />}
                      {member.role === 'owner' ? 'Admin (Account Owner)' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {member.role !== 'owner' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this member from your team?
                              They will lose access to all team data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMemberMutation.mutate(member.user_id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pending Invitations */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Pending Invitations</h4>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelInviteMutation.mutate(invite.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
