import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffMember {
  email: string;
  role: string;
  first_name: string | null;
  user_id: string | null;
}

export function AdminStaffDirectory() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                <div key={staff.email} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(staff.first_name, staff.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{staff.first_name || staff.email}</p>
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                  </div>
                  <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                    {staff.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}