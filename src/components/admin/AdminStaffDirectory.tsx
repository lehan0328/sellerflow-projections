import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, MoreVertical, Mail, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StaffMember {
  email: string;
  role: string;
  first_name: string | null;
  user_id: string | null;
  avg_response_time_hours: number | null;
  first_response_time_hours: number | null;
}

export function AdminStaffDirectory() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Email change dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedStaffForEmail, setSelectedStaffForEmail] = useState<StaffMember | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaffForDelete, setSelectedStaffForDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadStaffList();
  }, []);

  const loadStaffList = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-staff-list');
      
      if (error) throw error;
      
      setStaffList(data?.staff || []);
    } catch (error: any) {
      console.error('Error loading staff list:', error);
      toast.error('Failed to load staff directory');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleChangeEmail = (staff: StaffMember) => {
    setSelectedStaffForEmail(staff);
    setNewEmail(staff.email);
    setEmailDialogOpen(true);
  };

  const handleChangePassword = (staff: StaffMember) => {
    setSelectedStaffForPassword(staff);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handleDeleteAccount = (staff: StaffMember) => {
    setSelectedStaffForDelete(staff);
    setDeleteDialogOpen(true);
  };

  const confirmEmailChange = async () => {
    if (!selectedStaffForEmail?.user_id || !newEmail) return;

    try {
      setIsUpdatingEmail(true);
      
      const { data, error } = await supabase.functions.invoke('change-admin-email', {
        body: { 
          userId: selectedStaffForEmail.user_id,
          newEmail: newEmail
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Email updated successfully');
      setEmailDialogOpen(false);
      loadStaffList();
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const confirmPasswordChange = async () => {
    if (!selectedStaffForPassword?.user_id || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      
      const { data, error } = await supabase.functions.invoke('change-admin-password', {
        body: { 
          userId: selectedStaffForPassword.user_id,
          newPassword: newPassword
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Password updated successfully');
      setPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!selectedStaffForDelete?.user_id) return;

    try {
      setIsDeleting(true);
      
      const { data, error } = await supabase.functions.invoke('delete-admin-account', {
        body: { 
          userId: selectedStaffForDelete.user_id,
          userEmail: selectedStaffForDelete.email
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Account deleted successfully');
      setDeleteDialogOpen(false);
      loadStaffList();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatResponseTime = (hours: number | null) => {
    if (hours === null) return "N/A";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Staff Directory
          </CardTitle>
          <CardDescription>All admin and staff members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No staff members found</p>
          ) : (
            <div className="space-y-3">
              {staffList.map((staff) => (
                <div key={staff.email} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(staff.first_name, staff.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{staff.first_name || staff.email}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                        {staff.role === 'staff' && staff.avg_response_time_hours !== null && (
                          <span className="text-xs text-muted-foreground">
                            • Avg: {formatResponseTime(staff.avg_response_time_hours)}
                          </span>
                        )}
                        {staff.role === 'staff' && staff.first_response_time_hours !== null && (
                          <span className="text-xs text-muted-foreground">
                            • First: {formatResponseTime(staff.first_response_time_hours)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                      {staff.role}
                    </Badge>
                    
                    {staff.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeEmail(staff)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Change Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangePassword(staff)}>
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAccount(staff)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Change Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Update the email address for {selectedStaffForEmail?.first_name || selectedStaffForEmail?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEmailChange} disabled={isUpdatingEmail || !newEmail}>
              {isUpdatingEmail ? "Updating..." : "Update Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedStaffForPassword?.first_name || selectedStaffForPassword?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPasswordChange} disabled={isUpdatingPassword || !newPassword}>
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for {selectedStaffForDelete?.first_name || selectedStaffForDelete?.email}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}