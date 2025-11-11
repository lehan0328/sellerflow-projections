import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffMember {
  email: string;
  role: string;
  first_name: string | null;
  user_id: string | null;
  claimed_tickets_count: number;
  open_tickets_count: number;
  closed_tickets_count: number;
}

export function AdminStaffDirectory() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStaffList();
  }, []);

  const loadStaffList = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-staff-list');
      
      if (error) throw error;
      
      // Include both admin and staff roles - the edge function returns { staff: [...] }
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

  const handleViewStaffCases = (userId: string, staffName: string) => {
    // Navigate to support tickets tab with staff filter
    navigate(`/admin?tab=support&staff=${userId}&staffName=${encodeURIComponent(staffName)}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Staff Directory
          </CardTitle>
          <CardDescription>All admin and staff members with their case load</CardDescription>
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
                  {/* Left: Staff info */}
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(staff.first_name, staff.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{staff.first_name || staff.email}</p>
                      <p className="text-xs text-muted-foreground">{staff.email}</p>
                    </div>
                    <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                      {staff.role}
                    </Badge>
                  </div>
                  
                  {/* Middle: Ticket stats */}
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Total</p>
                      <p className="font-semibold text-lg">{staff.claimed_tickets_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Open</p>
                      <p className="font-semibold text-lg text-amber-600">{staff.open_tickets_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Closed</p>
                      <p className="font-semibold text-lg text-green-600">{staff.closed_tickets_count}</p>
                    </div>
                  </div>
                  
                  {/* Right: View Cases button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewStaffCases(staff.user_id!, staff.first_name || staff.email)}
                    disabled={!staff.user_id || staff.claimed_tickets_count === 0}
                  >
                    <LifeBuoy className="h-4 w-4 mr-2" />
                    View Cases ({staff.claimed_tickets_count})
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}