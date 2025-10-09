import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Customer {
  user_id: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  created_at: string;
  plan_override?: string;
  discount_redeemed_at?: string;
  trial_end?: string;
  churn_date?: string;
  account_status?: string;
  payment_failure_date?: string;
  email?: string;
}

interface ConversionMetrics {
  total: number;
  trial: number;
  paid: number;
  expired: number;
  conversionRate: number;
}

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, company, created_at, plan_override, discount_redeemed_at, trial_end, churn_date, account_status, payment_failure_date')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get emails for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      const customersWithEmail = profiles?.map(profile => ({
        ...profile,
        email: emailData?.emails?.[profile.user_id] || 'Unknown'
      })) || [];

      setCustomers(customersWithEmail);

      // Calculate metrics
      const now = new Date();
      const trial = profiles?.filter(c => 
        c.trial_end && new Date(c.trial_end) > now
      ).length || 0;
      const paid = profiles?.filter(c => 
        c.plan_override && !c.trial_end && ['starter', 'growing', 'professional'].includes(c.plan_override) && c.plan_override !== 'admin'
      ).length || 0;
      const expired = (profiles?.length || 0) - trial - paid;
      const conversionRate = profiles?.length ? (paid / profiles.length) * 100 : 0;

      setMetrics({
        total: profiles?.length || 0,
        trial,
        paid,
        expired,
        conversionRate
      });
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


  const toggleAccountStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'suspended_payment' ? 'active' : 'suspended_payment';
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          account_status: newStatus,
          payment_failure_date: newStatus === 'suspended_payment' ? new Date().toISOString() : null
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account ${newStatus === 'active' ? 'activated' : 'suspended'}`,
      });

      await fetchCustomers();
    } catch (error: any) {
      console.error('Error updating account status:', error);
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}'s account? This will delete ALL data associated with this account and cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account deleted successfully",
      });

      await fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    
    const status = getAccountStatus(customer);
    return matchesSearch && status.label.toLowerCase() === statusFilter;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading customers...</div>
        </CardContent>
      </Card>
    );
  }

  const getAccountStatus = (customer: Customer) => {
    const now = new Date();
    
    // Check for admin status
    if (customer.plan_override === 'admin') {
      return { label: 'Admin', variant: 'default' as const };
    }
    
    // Check trial status first (active trial period)
    if (customer.trial_end && new Date(customer.trial_end) > now) {
      return { label: 'Trial', variant: 'secondary' as const };
    }
    
    // Check for actual paid plans (not discounts or trial-related overrides)
    if (customer.plan_override && ['starter', 'growing', 'professional'].includes(customer.plan_override)) {
      return { label: 'Paid', variant: 'default' as const };
    }
    
    // Check if suspended
    if (customer.account_status === 'suspended_payment') {
      return { label: 'Suspended', variant: 'destructive' as const };
    }
    
    return { label: 'Expired', variant: 'destructive' as const };
  };

  const formatPlanName = (planOverride: string | undefined) => {
    if (!planOverride) return '-';
    // Capitalize first letter of each word
    return planOverride
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold">{metrics.total}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Trial</div>
            <div className="text-xl font-bold text-blue-600">{metrics.trial}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-xl font-bold text-green-600">{metrics.paid}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Conversion</div>
            <div className="text-xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
                <option value="admin">Admin</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Churn Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const status = getAccountStatus(customer);
                  const isSuspended = customer.account_status === 'suspended_payment';
                  return (
                    <TableRow key={customer.user_id} className={`text-sm ${isSuspended ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="font-medium">
                        {customer.first_name || customer.last_name
                          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                          : 'Unnamed'}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.company || '-'}</TableCell>
                      <TableCell>
                        {new Date(customer.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={status.variant} className="text-xs w-fit">
                            {status.label}
                          </Badge>
                          {isSuspended && customer.payment_failure_date && (
                            <span className="text-xs text-muted-foreground">
                              Failed: {new Date(customer.payment_failure_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.plan_override ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {formatPlanName(customer.plan_override)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.churn_date ? (
                          <span className="text-sm">
                            {new Date(customer.churn_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant={isSuspended ? "default" : "destructive"}
                            onClick={() => toggleAccountStatus(customer.user_id, customer.account_status || 'active')}
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAccount(
                              customer.user_id, 
                              `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'User'
                            )}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
