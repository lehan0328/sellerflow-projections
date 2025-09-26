import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, DollarSign, AlertTriangle, Edit, CreditCard, Search, ArrowUpDown, Filter } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { VendorOrderDetailModal } from "./vendor-order-detail-modal";
import * as React from "react";

interface VendorsOverviewProps {
  onVendorUpdate?: () => void;
  onEditOrder?: (vendor: Vendor) => void;
}

export const VendorsOverview = ({ onVendorUpdate, onEditOrder }: VendorsOverviewProps) => {
  const { vendors, loading, deleteVendor, refetch } = useVendors();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalOwed' | 'nextPaymentDate' | 'nextPaymentAmount'>('nextPaymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Vendor search options for autocomplete
  const vendorSearchOptions = useMemo(() => {
    return vendors.map(vendor => ({
      value: vendor.name.toLowerCase(),
      label: vendor.name
    }));
  }, [vendors]);

  // Filter and sort vendors - exclude vendors with $0 total owed
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = vendors.filter(vendor => {
      // Exclude vendors with no amount owed
      if (!vendor.totalOwed || vendor.totalOwed <= 0) {
        return false;
      }
      
      // Text search filter
      const matchesSearch = !searchTerm || 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.totalOwed.toString().includes(searchTerm) ||
        vendor.nextPaymentAmount.toString().includes(searchTerm);
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'overdue') {
        matchesStatus = vendor.nextPaymentDate && new Date(vendor.nextPaymentDate) < new Date();
      } else if (statusFilter === 'paid') {
        matchesStatus = vendor.totalOwed === 0 || vendor.status === 'paid';
      }
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'nextPaymentDate') {
        aValue = a.nextPaymentDate ? a.nextPaymentDate.getTime() : 0;
        bValue = b.nextPaymentDate ? b.nextPaymentDate.getTime() : 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      if (typeof aValue === 'number') {
        return sortOrder === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
      }

      return 0;
    });
  }, [vendors, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleEditOrder = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handlePayToday = async (vendor: Vendor) => {
    try {
      // Delete the vendor since payment is complete
      await deleteVendor(vendor.id);
      // Refresh data to ensure both calendar and vendor list are updated
      refetch();
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const getStatusColor = (vendor: Vendor) => {
    if (!vendor.nextPaymentDate) return 'default';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const dueDate = new Date(vendor.nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      return 'destructive'; // overdue
    } else if (daysDiff === 0) {
      return 'secondary'; // due today
    } else if (daysDiff <= 7) {
      return 'secondary'; // due within a week
    }
    return 'default'; // upcoming
  };

  const getStatusIcon = (vendor: Vendor) => {
    if (!vendor.nextPaymentDate) return <Calendar className="h-4 w-4" />;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const dueDate = new Date(vendor.nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const getStatusText = (vendor: Vendor) => {
    if (!vendor.nextPaymentDate) return 'No due date';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const dueDate = new Date(vendor.nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Debug logging
    console.log(`Vendor ${vendor.name}: Today=${today.toDateString()}, Due=${dueDate.toDateString()}`);
    
    // Calculate difference in days
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    console.log(`Vendor ${vendor.name}: daysDiff=${daysDiff}`);
    
    if (daysDiff > 0) {
      // Future date - show days remaining
      return `${daysDiff} days`;
    } else if (daysDiff === 0) {
      // Due today
      return 'Due Today';
    } else {
      // Past due - show overdue days
      const overdueDays = Math.abs(daysDiff);
      return overdueDays === 1 ? 'Overdue 1 day' : `Overdue ${overdueDays} days`;
    }
  };

  const totalOwed = filteredAndSortedVendors.reduce((sum, vendor) => sum + (vendor.totalOwed || 0), 0);
  const overdueAmount = filteredAndSortedVendors
    .filter(v => {
      if (!v.nextPaymentDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(v.nextPaymentDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .reduce((sum, vendor) => sum + (vendor.totalOwed || 0), 0);

  return (
    <Card className="shadow-card h-[700px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Vendors Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Owed:</span>
              <span className="font-semibold">${totalOwed.toLocaleString()}</span>
            </div>
            {overdueAmount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-semibold">
                  ${overdueAmount.toLocaleString()} Overdue
                </span>
              </div>
            )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 max-w-sm">
            <Combobox
              options={vendorSearchOptions}
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Search vendors..."
              emptyText="No vendors found."
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="totalOwed">Total Owed</SelectItem>
                <SelectItem value="nextPaymentAmount">Next Payment</SelectItem>
                <SelectItem value="nextPaymentDate">Due Date</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading vendors...
            </div>
          ) : filteredAndSortedVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No vendors found matching your search.' : 'No vendors with purchase orders.'}
            </div>
          ) : (
            filteredAndSortedVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-base">{vendor.name}</h4>
                      {vendor.category && (
                        <Badge variant="outline" className="text-xs">
                          {vendor.category}
                        </Badge>
                      )}
                      <Badge variant={getStatusColor(vendor)} className="text-xs">
                        {getStatusIcon(vendor)}
                        <span className="ml-1 capitalize">{getStatusText(vendor)}</span>
                      </Badge>
                    </div>
                    {vendor.poName && (
                      <span className="font-medium text-sm text-right">
                        {vendor.poName}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <span className="text-muted-foreground">Total Owed:</span>
                      <span className="font-medium text-foreground ml-2">
                        ${(vendor.totalOwed || 0).toLocaleString()}
                      </span>
                      <div className="ml-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditOrder(vendor)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit Order
                        </Button>
                      </div>
                    </div>
                    {vendor.nextPaymentDate && (
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span className="font-medium text-foreground ml-2">
                          {new Date(vendor.nextPaymentDate).toLocaleDateString()}
                        </span>
                        <div className="ml-auto">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="bg-gradient-primary px-4"
                                disabled={!vendor.totalOwed || vendor.totalOwed <= 0}
                              >
                                <CreditCard className="mr-1 h-3 w-3" />
                                Pay Today
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Mark payment to {vendor.name} (${(vendor.totalOwed || 0).toLocaleString()}) as paid today?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handlePayToday(vendor)}>
                                  Mark as Paid
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )))}
        </div>
      </CardContent>
      
      <VendorOrderDetailModal
        open={!!editingVendor}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVendor(null);
            refetch();
            onVendorUpdate?.();
          }
        }}
        vendor={editingVendor}
      />
    </Card>
  );
};