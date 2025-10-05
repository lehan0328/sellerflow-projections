import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mail, Calendar, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  created_at: string;
  is_admin: boolean;
  plan_override?: string;
  discount_redeemed_at?: string;
}

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin status ${!currentStatus ? 'granted' : 'revoked'}`,
      });

      await fetchCustomers();
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading customers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Management</CardTitle>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.user_id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {customer.first_name || customer.last_name
                          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                          : 'Unnamed User'}
                      </h3>
                      {customer.is_admin && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {customer.plan_override && (
                        <Badge variant="secondary">
                          {customer.plan_override}
                        </Badge>
                      )}
                      {customer.discount_redeemed_at && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          Discount Used
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                      {customer.company && (
                        <span>{customer.company}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(customer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={customer.is_admin ? "destructive" : "default"}
                    onClick={() => toggleAdminStatus(customer.user_id, customer.is_admin)}
                  >
                    {customer.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
