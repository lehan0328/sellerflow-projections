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
        .select('user_id, first_name, last_name, company, created_at, plan_override, discount_redeemed_at, trial_end')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(profiles || []);

      // Calculate metrics
      const now = new Date();
      const trial = profiles?.filter(c => 
        c.trial_end && new Date(c.trial_end) > now && !c.plan_override
      ).length || 0;
      const paid = profiles?.filter(c => c.plan_override).length || 0;
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


  const filteredCustomers = customers.filter(customer => 
    customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
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
    if (customer.plan_override) return { label: 'Paid', variant: 'default' as const };
    if (customer.trial_end && new Date(customer.trial_end) > now) return { label: 'Trial', variant: 'secondary' as const };
    return { label: 'Expired', variant: 'destructive' as const };
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
          <div className="flex items-center justify-between">
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or company..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const status = getAccountStatus(customer);
                  return (
                    <TableRow key={customer.user_id} className="text-sm">
                      <TableCell className="font-medium">
                        {customer.first_name || customer.last_name
                          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                          : 'Unnamed'}
                      </TableCell>
                      <TableCell>{customer.company || '-'}</TableCell>
                      <TableCell>
                        {new Date(customer.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.plan_override ? (
                          <Badge variant="outline" className="text-xs">
                            {customer.plan_override}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
