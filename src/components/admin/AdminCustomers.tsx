import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download } from "lucide-react";
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
  amazon_revenue?: number | string;
  renewal_date?: string;
  last_paid_date?: string;
  stripe_customer_id?: string;
  stripe_plan_name?: string;
  stripe_subscription_status?: string;
  stripe_customer_exists?: boolean;
  role?: string;
  account_owner_company?: string;
  referral_code?: string;
  affiliate_code?: string;
  account_id?: string;
  is_account_owner?: boolean;
  team_members?: Customer[];
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
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'trial' | 'active' | 'churned'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, company, created_at, plan_override, discount_redeemed_at, trial_end, churn_date, account_status, payment_failure_date, stripe_customer_id, account_id, is_account_owner, monthly_amazon_revenue')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get emails for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      // Calculate Amazon payouts for each user (last 30 days, confirmed only)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const customersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Fetch referral code used by this customer
          const { data: referralData } = await supabase
            .from('referrals')
            .select('referral_code')
            .eq('referred_user_id', profile.user_id)
            .maybeSingle();

          // Fetch affiliate code used by this customer
          const { data: affiliateData } = await supabase
            .from('affiliate_referrals')
            .select('affiliate_code')
            .eq('referred_user_id', profile.user_id)
            .maybeSingle();

          // Fetch user role
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role, account_id')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          // If user is staff/admin (not owner), fetch the account owner's company and monthly revenue
          let accountOwnerCompany = null;
          let monthlyRevenue = profile.monthly_amazon_revenue || null;
          if (userRole && userRole.role !== 'owner') {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('company, monthly_amazon_revenue')
              .eq('account_id', userRole.account_id)
              .eq('is_account_owner', true)
              .maybeSingle();
            
            accountOwnerCompany = ownerProfile?.company;
            monthlyRevenue = ownerProfile?.monthly_amazon_revenue || null;
          }

          // Fetch Stripe subscription data if customer has stripe_customer_id
          let renewalDate = null;
          let lastPaidDate = null;
          let stripePlanName = null;
          let stripeSubscriptionStatus = null;
          let stripeCustomerExists = false;
          
          if (profile.stripe_customer_id) {
            try {
              const { data: stripeData } = await supabase.functions.invoke('get-customer-subscription-details', {
                body: { customerId: profile.stripe_customer_id }
              });
              
              if (stripeData) {
                renewalDate = stripeData.renewal_date;
                lastPaidDate = stripeData.last_paid_date;
                stripePlanName = stripeData.plan_name;
                stripeSubscriptionStatus = stripeData.subscription_status;
                stripeCustomerExists = stripeData.customer_exists;
              }
            } catch (error) {
              console.error('Error fetching Stripe data for customer:', profile.user_id, error);
            }
          }

          // Calculate renewal date if not provided by Stripe but last paid date exists
          let calculatedRenewalDate = renewalDate;
          if (!calculatedRenewalDate && lastPaidDate) {
            const lastPaid = new Date(lastPaidDate);
            lastPaid.setMonth(lastPaid.getMonth() + 1);
            calculatedRenewalDate = lastPaid.toISOString();
          }

          return {
            ...profile,
            email: emailData?.emails?.[profile.user_id] || 'Unknown',
            amazon_revenue: monthlyRevenue || 'Not provided',
            renewal_date: calculatedRenewalDate,
            last_paid_date: lastPaidDate,
            stripe_plan_name: stripePlanName,
            stripe_subscription_status: stripeSubscriptionStatus,
            stripe_customer_exists: stripeCustomerExists,
            role: userRole?.role,
            account_owner_company: accountOwnerCompany,
            referral_code: referralData?.referral_code,
            affiliate_code: affiliateData?.affiliate_code,
            team_members: []
          };
        })
      );

      // Group team members under their parent accounts
      const groupedCustomers: Customer[] = [];
      const accountOwnersMap = new Map<string, Customer>();
      
      // First pass: identify account owners (or users with account_id set)
      customersWithData.forEach(customer => {
        if (customer.is_account_owner && customer.account_id) {
          accountOwnersMap.set(customer.account_id, customer);
          groupedCustomers.push(customer);
        }
      });
      
      // Second pass: attach team members to their owners OR add as standalone
      customersWithData.forEach(customer => {
        // Skip if already added as account owner
        if (customer.is_account_owner && customer.account_id) {
          return;
        }
        
        // Try to attach to owner if account_id exists
        if (customer.account_id) {
          const owner = accountOwnersMap.get(customer.account_id);
          if (owner && !customer.is_account_owner) {
            owner.team_members!.push(customer);
          } else if (!owner) {
            // No owner found but has account_id, add as standalone
            groupedCustomers.push(customer);
          }
        } else {
          // No account_id at all, add as standalone
          groupedCustomers.push(customer);
        }
      });

      setCustomers(groupedCustomers);

      // Calculate metrics
      const now = new Date();
      
      // Trial: users with trial_end in the future
      const trial = profiles?.filter(c => 
        c.trial_end && new Date(c.trial_end) > now
      ).length || 0;
      
      // Paid: users with Stripe customer ID and valid subscription
      // (We'll fetch this from Stripe for accuracy)
      let paid = 0;
      const paidUserIds = new Set<string>();
      
      for (const profile of profiles || []) {
        if (profile.stripe_customer_id) {
          try {
            const { data: stripeData } = await supabase.functions.invoke('get-customer-subscription-details', {
              body: { customerId: profile.stripe_customer_id }
            });
            
            if (stripeData?.has_active_subscription) {
              paid++;
              paidUserIds.add(profile.user_id);
            }
          } catch (error) {
            console.error('Error checking subscription for', profile.user_id, error);
          }
        }
      }
      
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

  const backfillStripeCustomerIds = async () => {
    if (!confirm("This will sync Stripe customer IDs for all customers. This may take a while. Continue?")) {
      return;
    }

    try {
      setIsBackfilling(true);
      const { data, error } = await supabase.functions.invoke('backfill-stripe-customer-ids');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Backfill complete: ${data.updated} updated, ${data.skipped} skipped, ${data.errors} errors`,
      });

      await fetchCustomers();
    } catch (error: any) {
      console.error('Error backfilling:', error);
      toast({
        title: "Error",
        description: "Failed to backfill Stripe customer IDs",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const getAccountStatus = (customer: Customer) => {
    const now = new Date();
    
    // Check for admin status (website admin, not company admin)
    if (customer.plan_override === 'admin') {
      return { label: 'Admin', variant: 'default' as const };
    }
    
    // Check for active Stripe subscription first (most accurate)
    // Active subscription status from Stripe takes priority
    if (customer.stripe_subscription_status === 'active' || customer.stripe_subscription_status === 'trialing') {
      return { label: 'Paid', variant: 'default' as const };
    }
    
    // If renewal_date is set and in the future, they have an active subscription
    if (customer.renewal_date && new Date(customer.renewal_date) > now) {
      return { label: 'Paid', variant: 'default' as const };
    }
    
    // Check trial status (active trial period)
    if (customer.trial_end && new Date(customer.trial_end) > now) {
      return { label: 'Trial', variant: 'secondary' as const };
    }
    
    // Check if suspended
    if (customer.account_status === 'suspended_payment') {
      return { label: 'Suspended', variant: 'destructive' as const };
    }
    
    // Check if they ever had a subscription but it expired
    if (customer.stripe_customer_id || customer.last_paid_date) {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    
    // Trial expired or never had trial
    return { label: 'Expired', variant: 'destructive' as const };
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

  // Separate customers into trial, active (paid), and churned
  const trialCustomers = filteredCustomers.filter(customer => {
    const status = getAccountStatus(customer);
    return status.label === 'Trial';
  });

  const activeCustomers = filteredCustomers.filter(customer => {
    const status = getAccountStatus(customer);
    return status.label === 'Paid';
  });

  const churnedCustomers = filteredCustomers.filter(customer => {
    const status = getAccountStatus(customer);
    return status.label === 'Expired' || status.label === 'Suspended';
  });

  const displayedCustomers = viewMode === 'all'
    ? filteredCustomers
    : viewMode === 'trial' 
    ? trialCustomers 
    : viewMode === 'active' 
    ? activeCustomers 
    : churnedCustomers;
    
  const totalPages = Math.ceil(displayedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = displayedCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: 'all' | 'trial' | 'active' | 'churned') => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    try {
      // CSV headers
      const headers = [
        'Name',
        'Email',
        'Company',
        'Joined',
        'Status',
        'Plan',
        'Discount',
        'Amazon Payouts (30d)',
        'Renewal Date',
        'Last Paid',
        'Churn Date',
        'Role',
        'Stripe Customer ID'
      ];

      // Create CSV rows
      const rows = displayedCustomers.map(customer => {
        const status = getAccountStatus(customer);
        const name = customer.first_name || customer.last_name
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : 'Unnamed';
        
        return [
          name,
          customer.email || '',
          customer.company || '-',
          new Date(customer.created_at).toLocaleDateString('en-US'),
          status.label,
          customer.stripe_plan_name || formatPlanName(customer.plan_override) || '-',
          customer.referral_code || customer.affiliate_code || (customer.discount_redeemed_at ? '10% off' : '-'),
          `$${(customer.amazon_revenue || 0).toLocaleString('en-US')}`,
          customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString('en-US') : '-',
          customer.last_paid_date ? new Date(customer.last_paid_date).toLocaleDateString('en-US') : '-',
          customer.churn_date ? new Date(customer.churn_date).toLocaleDateString('en-US') : '-',
          customer.role || 'owner',
          customer.stripe_customer_id || '-'
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
      });

      // Combine headers and rows
      const csv = [headers.join(','), ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `customers-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Exported ${displayedCustomers.length} customers to CSV`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    }
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
            <div className="flex items-center gap-3">
              <CardTitle>
                {viewMode === 'all' ? 'All' : viewMode === 'trial' ? 'Trial' : viewMode === 'active' ? 'Active (Paid)' : 'Churned'} Customers ({displayedCustomers.length})
              </CardTitle>
              <div className="flex gap-0 border rounded-md">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('all')}
                  className="rounded-r-none border-r"
                >
                  All ({filteredCustomers.length})
                </Button>
                <Button
                  variant={viewMode === 'trial' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('trial')}
                  className="rounded-none border-r"
                >
                  Trial ({trialCustomers.length})
                </Button>
                <Button
                  variant={viewMode === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('active')}
                  className="rounded-none border-r"
                >
                  Active ({activeCustomers.length})
                </Button>
                <Button
                  variant={viewMode === 'churned' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('churned')}
                  className="rounded-l-none"
                >
                  Churned ({churnedCustomers.length})
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                onClick={backfillStripeCustomerIds}
                disabled={isBackfilling}
                variant="outline"
                size="sm"
              >
                {isBackfilling ? 'Syncing...' : 'Sync Stripe IDs'}
              </Button>
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
                <TableHead>{viewMode === 'churned' ? 'Last Plan' : 'Plan'}</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Last Paid</TableHead>
                {viewMode === 'churned' && <TableHead>Churn Date</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const status = getAccountStatus(customer);
                  const isSuspended = customer.account_status === 'suspended_payment';
                  const hasTeamMembers = customer.team_members && customer.team_members.length > 0;
                  const isExpanded = customer.account_id ? expandedAccounts.has(customer.account_id) : false;
                  
                  return (
                    <>
                    <TableRow key={customer.user_id} className={`text-sm ${isSuspended ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {hasTeamMembers && (
                            <button
                              onClick={() => toggleAccountExpansion(customer.account_id!)}
                              className="hover:bg-muted p-1 rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <span>
                            {customer.first_name || customer.last_name
                              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                              : 'Unnamed'}
                            {hasTeamMembers && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {customer.team_members!.length} {customer.team_members!.length === 1 ? 'member' : 'members'}
                              </Badge>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        {customer.role && customer.role !== 'owner' && customer.account_owner_company ? (
                          <span className="text-sm">{customer.account_owner_company}</span>
                        ) : (
                          customer.company || '-'
                        )}
                      </TableCell>
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
                        <div className="flex flex-col gap-1">
                          {customer.stripe_plan_name ? (
                            <>
                              <Badge variant="default" className="text-xs w-fit">
                                {customer.stripe_plan_name}
                              </Badge>
                              {customer.stripe_subscription_status && customer.stripe_subscription_status !== 'active' && (
                                <span className="text-xs text-yellow-600">
                                  {customer.stripe_subscription_status}
                                </span>
                              )}
                            </>
                          ) : customer.plan_override && ['starter', 'growing', 'professional', 'admin'].includes(customer.plan_override) ? (
                            <Badge variant="outline" className="text-xs capitalize">
                              {formatPlanName(customer.plan_override)}
                            </Badge>
                          ) : customer.role && customer.role !== 'owner' ? (
                            <Badge variant="outline" className="text-xs">
                              Team
                            </Badge>
                          ) : customer.stripe_customer_id && !customer.stripe_customer_exists ? (
                            <span className="text-xs text-destructive">Stripe Error</span>
                          ) : (
                            <span className="text-muted-foreground">No Plan</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.referral_code || customer.affiliate_code ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {customer.referral_code || customer.affiliate_code}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {customer.referral_code ? 'Referral' : 'Affiliate'} - 10% off
                            </span>
                          </div>
                        ) : customer.plan_override === 'referred_user_discount' ? (
                          <span className="text-sm">10% off (legacy)</span>
                        ) : customer.discount_redeemed_at ? (
                          <span className="text-sm">10% off</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {typeof customer.amazon_revenue === 'string' ? customer.amazon_revenue : 'Not provided'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {customer.renewal_date ? (
                          <span className="text-sm">
                            {new Date(customer.renewal_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.last_paid_date ? (
                          <span className="text-sm">
                            {new Date(customer.last_paid_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {viewMode === 'churned' && (
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
                      )}
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
                    {/* Team members */}
                    {hasTeamMembers && isExpanded && customer.team_members!.map((member) => {
                      const memberStatus = getAccountStatus(member);
                      const memberSuspended = member.account_status === 'suspended_payment';
                      return (
                        <TableRow key={member.user_id} className={`text-sm bg-muted/30 ${memberSuspended ? 'bg-destructive/5' : ''}`}>
                          <TableCell className="font-medium pl-12">
                            <span className="text-muted-foreground">└─</span> {member.first_name || member.last_name
                              ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                              : 'Unnamed'}
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">Team Member</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(member.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={memberStatus.variant} className="text-xs w-fit">
                              {memberStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {member.role || 'staff'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              ${(member.amazon_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">-</span>
                          </TableCell>
                          {viewMode === 'churned' && (
                            <TableCell>
                              <span className="text-muted-foreground">-</span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteAccount(
                                  member.user_id, 
                                  `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'User'
                                )}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayedCustomers.length)} of {displayedCustomers.length}
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
