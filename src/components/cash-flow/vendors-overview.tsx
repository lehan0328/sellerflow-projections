import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, DollarSign, AlertTriangle, Plus, Edit, CreditCard, Search, ArrowUpDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import * as React from "react";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'current' | 'overdue' | 'upcoming';
  category: string;
}

interface VendorsOverviewProps {
  vendors: Vendor[];
  onPayToday?: (vendor: Vendor, amount?: number) => void;
  onVendorUpdate?: (vendors: Vendor[]) => void;
  onEditOrder?: (vendor: Vendor) => void;
}

export const VendorsOverview = ({ vendors: propVendors, onPayToday, onVendorUpdate, onEditOrder }: VendorsOverviewProps) => {
  const [vendors, setVendors] = useState<Vendor[]>(propVendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'totalOwed' | 'nextPaymentDate' | 'nextPaymentAmount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Update local state when props change
  React.useEffect(() => {
    setVendors(propVendors);
  }, [propVendors]);

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.totalOwed.toString().includes(searchTerm) ||
      vendor.nextPaymentAmount.toString().includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'nextPaymentDate') {
        aValue = a.nextPaymentDate.getTime();
        bValue = b.nextPaymentDate.getTime();
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
  }, [vendors, searchTerm, sortBy, sortOrder]);

  const handleSaveVendor = (updatedVendor: Vendor) => {
    const updatedVendors = vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v);
    setVendors(updatedVendors);
    onVendorUpdate?.(updatedVendors);
  };

  const handlePayToday = (vendor: Vendor, customAmount?: number) => {
    const paymentAmount = customAmount || vendor.nextPaymentAmount;
    const newTotalOwed = vendor.totalOwed - paymentAmount;
    
    if (newTotalOwed <= 0) {
      // Full payment - remove vendor from list
      const updatedVendors = vendors.filter(v => v.id !== vendor.id);
      setVendors(updatedVendors);
      onVendorUpdate?.(updatedVendors);
      toast.success(`Full payment completed for ${vendor.name}. Vendor removed from overview.`);
    } else {
      // Partial payment - update vendor
      const updatedVendor = {
        ...vendor,
        totalOwed: newTotalOwed,
        nextPaymentAmount: Math.min(newTotalOwed, vendor.nextPaymentAmount)
      };
      const updatedVendors = vendors.map(v => v.id === vendor.id ? updatedVendor : v);
      setVendors(updatedVendors);
      onVendorUpdate?.(updatedVendors);
      toast.success(`Partial payment of $${paymentAmount.toLocaleString()} made to ${vendor.name}. Remaining: $${newTotalOwed.toLocaleString()}`);
    }
    
    onPayToday?.(vendor, paymentAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'upcoming':
        return 'default';
      case 'current':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const totalOwed = filteredAndSortedVendors.reduce((sum, vendor) => sum + vendor.totalOwed, 0);
  const overdueAmount = filteredAndSortedVendors
    .filter(v => v.status === 'overdue')
    .reduce((sum, vendor) => sum + vendor.totalOwed, 0);

  return (
    <Card className="shadow-card h-fit flex flex-col">
      <CardHeader>
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search vendors or amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
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
      <CardContent className="p-4">
        <div className="max-h-[620px] overflow-y-auto space-y-4 pr-2">
          {filteredAndSortedVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No vendors found matching your search.' : 'No vendors to display.'}
            </div>
          ) : (
            filteredAndSortedVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-5 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="font-semibold text-lg">{vendor.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {vendor.category}
                    </Badge>
                    <Badge variant={getStatusColor(vendor.status)} className="text-xs">
                      {getStatusIcon(vendor.status)}
                      <span className="ml-1 capitalize">{vendor.status}</span>
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Owed:</span>
                      <span className="font-medium text-foreground text-lg">
                        ${vendor.totalOwed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next Payment:</span>
                      <span className="font-medium text-foreground">
                        ${vendor.nextPaymentAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-medium text-foreground">
                        {vendor.nextPaymentDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('Edit button clicked for vendor:', vendor);
                    console.log('onEditOrder function:', onEditOrder);
                    onEditOrder?.(vendor);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary px-6"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Today
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to move the payment for {vendor.name} (${vendor.nextPaymentAmount.toLocaleString()}) to today's date?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handlePayToday(vendor)}>
                        Yes, Pay Today
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )))}
        </div>
      </CardContent>
    </Card>
  );
};