import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Edit, DollarSign, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DeletedTransaction {
  id: string;
  transaction_type: 'vendor' | 'income';
  name: string;
  amount: number;
  description: string;
  payment_date: string;
  status: string;
  category: string;
  deleted_at: string;
}

export default function TransactionLog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "vendors";

  const { vendors, deleteVendor, updateVendor } = useVendors();
  const { incomeItems, deleteIncome, updateIncome } = useIncome();
  const { transactions, deleteTransaction } = useTransactions();
  const [deletedTransactions, setDeletedTransactions] = useState<DeletedTransaction[]>([]);

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [vendorStatusFilter, setVendorStatusFilter] = useState<string>("all");
  const [incomeStatusFilter, setIncomeStatusFilter] = useState<string>("all");
  const [vendorDateRange, setVendorDateRange] = useState<string>("all");
  const [incomeDateRange, setIncomeDateRange] = useState<string>("all");
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  const [editingVendor, setEditingVendor] = useState<any>(null);

  // Fetch deleted transactions
  const fetchDeletedTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('deleted_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted transactions:', error);
      return;
    }

    setDeletedTransactions((data || []) as DeletedTransaction[]);
  }, []);

  useEffect(() => {
    fetchDeletedTransactions();
  }, [fetchDeletedTransactions]);

  // Refresh when switching to Deleted tab
  useEffect(() => {
    if (activeTab === 'deleted') {
      fetchDeletedTransactions();
    }
  }, [activeTab, fetchDeletedTransactions]);

  // Realtime updates for deleted transactions
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('deleted-transactions-ch')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'deleted_transactions',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setDeletedTransactions((prev) => [payload.new as unknown as DeletedTransaction, ...prev]);
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Filter vendors by status and date
  const filteredVendors = useMemo(() => {
    let filtered = vendors;

    // Status filter
    if (vendorStatusFilter === "pending") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(v => {
        if (!v.nextPaymentDate) return false;
        const dueDate = new Date(v.nextPaymentDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });
    } else if (vendorStatusFilter === "due") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(v => {
        if (!v.nextPaymentDate) return false;
        const dueDate = new Date(v.nextPaymentDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate <= today;
      });
    } else if (vendorStatusFilter === "paid") {
      filtered = filtered.filter(v => v.status === "paid" || v.totalOwed === 0);
    }

    // Date range filter
    if (vendorDateRange !== "all" && vendorDateRange !== "custom") {
      const now = new Date();
      const days = vendorDateRange === "3days" ? 3 : vendorDateRange === "7days" ? 7 : 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(v => {
        if (!v.nextPaymentDate) return false;
        return new Date(v.nextPaymentDate) >= startDate;
      });
    } else if (vendorDateRange === "custom" && customFromDate && customToDate) {
      filtered = filtered.filter(v => {
        if (!v.nextPaymentDate) return false;
        const date = new Date(v.nextPaymentDate);
        return date >= customFromDate && date <= customToDate;
      });
    }

    return filtered;
  }, [vendors, vendorStatusFilter, vendorDateRange, customFromDate, customToDate]);

  // Filter income by status and date
  const filteredIncome = useMemo(() => {
    let filtered = incomeItems;

    // Status filter
    if (incomeStatusFilter === "pending") {
      filtered = filtered.filter(i => i.status === "pending");
    } else if (incomeStatusFilter === "overdue") {
      filtered = filtered.filter(i => i.status === "overdue");
    } else if (incomeStatusFilter === "received") {
      filtered = filtered.filter(i => i.status === "received");
    }

    // Date range filter
    if (incomeDateRange !== "all" && incomeDateRange !== "custom") {
      const now = new Date();
      const days = incomeDateRange === "3days" ? 3 : incomeDateRange === "7days" ? 7 : 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(i => {
        return new Date(i.paymentDate) >= startDate;
      });
    } else if (incomeDateRange === "custom" && customFromDate && customToDate) {
      filtered = filtered.filter(i => {
        const date = new Date(i.paymentDate);
        return date >= customFromDate && date <= customToDate;
      });
    }

    return filtered;
  }, [incomeItems, incomeStatusFilter, incomeDateRange, customFromDate, customToDate]);

  const getVendorStatus = (vendor: any) => {
    // Check if vendor is marked as paid
    if (vendor.status === 'paid' || vendor.totalOwed === 0) {
      return { text: "Paid", variant: "secondary" as const };
    }
    
    if (!vendor.nextPaymentDate) return { text: "No due date", variant: "default" as const };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(vendor.nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      const overdueDays = Math.abs(daysDiff);
      return { 
        text: overdueDays === 1 ? "Overdue 1 day" : `Overdue ${overdueDays} days`,
        variant: "destructive" as const
      };
    } else if (daysDiff === 0) {
      return { text: "Due Today", variant: "secondary" as const };
    } else if (daysDiff <= 7) {
      return { text: `${daysDiff} days`, variant: "secondary" as const };
    } else {
      return { text: `${daysDiff} days to due`, variant: "default" as const };
    }
  };

  const handlePayVendor = async (vendor: any) => {
    try {
      await updateVendor(vendor.id, { 
        status: 'paid' as const,
        totalOwed: 0 
      });
      toast.success("Payment recorded", {
        description: `${vendor.name} has been marked as paid.`
      });
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleDeleteVendor = async (vendor: any) => {
    try {
      await deleteVendor(vendor.id);
      await fetchDeletedTransactions();
      toast.success("Transaction deleted");
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  const handlePayIncome = async (income: any) => {
    try {
      await updateIncome(income.id, { status: "received" });
      toast.success("Income received", {
        description: `${income.description} has been marked as received.`
      });
    } catch (error) {
      toast.error("Failed to update income");
    }
  };

  const handleDeleteIncome = async (income: any) => {
    try {
      await deleteIncome(income.id);
      await fetchDeletedTransactions();
      toast.success("Transaction deleted");
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleRestoreTransaction = async (transaction: any) => {
    try {
      // Implementation depends on transaction type
      toast.success("Transaction restored");
    } catch (error) {
      toast.error("Failed to restore transaction");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-3xl font-bold">Transaction Log</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="vendors">Vendor Transactions</TabsTrigger>
            <TabsTrigger value="income">Income Transactions</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Vendor Purchase Orders</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={vendorStatusFilter} onValueChange={setVendorStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="due">Due</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={vendorDateRange} onValueChange={setVendorDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="3days">Last 3 Days</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>

                    {vendorDateRange === "custom" && (
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customFromDate ? format(customFromDate, "MMM dd") : "From"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customFromDate}
                              onSelect={setCustomFromDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customToDate ? format(customToDate, "MMM dd") : "To"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customToDate}
                              onSelect={setCustomToDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>PO#</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No vendor transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((vendor) => {
                        const status = getVendorStatus(vendor);
                        return (
                          <TableRow key={vendor.id}>
                            <TableCell>
                              {vendor.created_at
                                ? new Date(vendor.created_at).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {vendor.poName || vendor.description || "N/A"}
                            </TableCell>
                            <TableCell>{vendor.name}</TableCell>
                            <TableCell className="font-semibold">
                              ${vendor.totalOwed?.toLocaleString() || "0"}
                            </TableCell>
                            <TableCell>
                              {vendor.nextPaymentDate
                                ? new Date(vendor.nextPaymentDate).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.text}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingVendor(vendor)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                 variant="default"
                                 size="sm"
                                 onClick={() => handlePayVendor(vendor)}
                                 disabled={vendor.status === 'paid' || vendor.totalOwed === 0}
                                >
                                  <DollarSign className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteVendor(vendor)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Income Transactions</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={incomeStatusFilter} onValueChange={setIncomeStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={incomeDateRange} onValueChange={setIncomeDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="3days">Last 3 Days</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>

                    {incomeDateRange === "custom" && (
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customFromDate ? format(customFromDate, "MMM dd") : "From"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customFromDate}
                              onSelect={setCustomFromDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customToDate ? format(customToDate, "MMM dd") : "To"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customToDate}
                              onSelect={setCustomToDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncome.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No income transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIncome.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell>
                            {new Date(income.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{income.description}</TableCell>
                          <TableCell>{income.source}</TableCell>
                          <TableCell className="font-semibold">
                            ${income.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(income.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                             <Badge
                               variant={
                                 income.status === "received"
                                   ? "secondary"
                                   : income.status === "overdue"
                                   ? "destructive"
                                   : "default"
                               }
                             >
                               {income.status.charAt(0).toUpperCase() + income.status.slice(1)}
                             </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handlePayIncome(income)}
                                disabled={income.status === "received"}
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteIncome(income)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deleted Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor/Customer</TableHead>
                      <TableHead>PO# / Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No deleted transactions
                        </TableCell>
                      </TableRow>
                    ) : (
                      deletedTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            <Badge variant="outline">{transaction.transaction_type}</Badge>
                          </TableCell>
                          <TableCell>{transaction.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {transaction.description || 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${Math.abs(Number(transaction.amount)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editingVendor && (
          <VendorOrderEditModal
            vendor={editingVendor}
            open={!!editingVendor}
            onOpenChange={(open) => !open && setEditingVendor(null)}
            onSave={async (updates) => {
              await updateVendor(editingVendor.id, updates);
              setEditingVendor(null);
              toast.success("Vendor order updated");
            }}
            onDelete={async (vendor) => {
              await handleDeleteVendor(vendor);
              setEditingVendor(null);
            }}
          />
        )}
      </div>
    </div>
  );
}