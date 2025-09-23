import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Calendar, DollarSign, AlertTriangle, Plus, Edit, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
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

  // Update local state when props change
  React.useEffect(() => {
    setVendors(propVendors);
  }, [propVendors]);

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

  const totalOwed = vendors.reduce((sum, vendor) => sum + vendor.totalOwed, 0);
  const overdueAmount = vendors
    .filter(v => v.status === 'overdue')
    .reduce((sum, vendor) => sum + vendor.totalOwed, 0);

  return (
    <Card className="shadow-card">
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
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
          {vendors.map((vendor) => (
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
                  onClick={() => onEditOrder?.(vendor)}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};