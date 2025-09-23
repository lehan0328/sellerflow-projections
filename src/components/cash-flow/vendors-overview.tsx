import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, DollarSign, AlertTriangle, Plus, Edit, CreditCard } from "lucide-react";
import { useState } from "react";
import { VendorEditModal } from "./vendor-edit-modal";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'current' | 'overdue' | 'upcoming';
  category: string;
}

interface VendorsOverviewProps {}

export const VendorsOverview = ({}: VendorsOverviewProps) => {
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: '1',
      name: 'Global Vendor Co.',
      totalOwed: 28500,
      nextPaymentDate: new Date(2024, 0, 18),
      nextPaymentAmount: 8500,
      status: 'upcoming',
      category: 'Inventory'
    },
    {
      id: '2',
      name: 'Amazon Advertising',
      totalOwed: 3200,
      nextPaymentDate: new Date(2024, 0, 25),
      nextPaymentAmount: 3200,
      status: 'current',
      category: 'Marketing'
    },
    {
      id: '3',
      name: 'Packaging Solutions Inc.',
      totalOwed: 5400,
      nextPaymentDate: new Date(2024, 0, 12),
      nextPaymentAmount: 2700,
      status: 'overdue',
      category: 'Packaging'
    },
    {
      id: '4',
      name: 'Logistics Partners',
      totalOwed: 1800,
      nextPaymentDate: new Date(2024, 0, 28),
      nextPaymentAmount: 1800,
      status: 'upcoming',
      category: 'Shipping'
    }
  ]);

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handleSaveVendor = (updatedVendor: Vendor) => {
    setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
  };

  const handlePayNow = (vendor: Vendor) => {
    toast.success(`Payment initiated for ${vendor.name} - $${vendor.nextPaymentAmount.toLocaleString()}`);
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
                  onClick={() => handleEditVendor(vendor)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-primary px-6"
                  onClick={() => handlePayNow(vendor)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <VendorEditModal
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSave={handleSaveVendor}
        />
      </CardContent>
    </Card>
  );
};