import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign 
} from "lucide-react";
import { VendorForm } from "@/components/cash-flow/vendor-form";
import { VendorEditModal } from "@/components/cash-flow/vendor-edit-modal";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { format } from "date-fns";

export function VendorManagement() {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { vendors, loading, addVendor, updateVendor, deleteVendor } = useVendors();

  const handleAddVendor = async (vendorData: any) => {
    await addVendor({
      name: vendorData.name,
      totalOwed: 0,
      nextPaymentDate: new Date(),
      nextPaymentAmount: 0,
      status: 'upcoming',
      category: vendorData.category || '',
      paymentType: vendorData.paymentType,
      netTermsDays: vendorData.netTermsDays
    });
    setShowAddVendor(false);
  };

  const handleUpdateVendor = async (updatedVendor: Vendor) => {
    await updateVendor(updatedVendor.id, updatedVendor);
    setEditingVendor(null);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (confirm('Are you sure you want to delete this vendor? This will also delete all associated transactions.')) {
      await deleteVendor(vendorId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'current':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="h-32 bg-muted animate-pulse rounded"></div>
        <div className="h-32 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Vendor Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your vendors and their payment information
          </p>
        </div>
        <Button onClick={() => setShowAddVendor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No vendors yet</h4>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Add your first vendor to start managing payments and purchase orders
            </p>
            <Button onClick={() => setShowAddVendor(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    {vendor.category && (
                      <p className="text-sm text-muted-foreground">{vendor.category}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(vendor.status)}>
                    {vendor.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingVendor(vendor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVendor(vendor.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Total Owed: ${vendor.totalOwed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Next Payment: {format(vendor.nextPaymentDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  {vendor.nextPaymentAmount > 0 && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Next Amount: ${vendor.nextPaymentAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {vendor.paymentType && (
                    <div className="flex items-center space-x-2">
                      <span>Payment Type: {vendor.paymentType}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VendorForm
        open={showAddVendor}
        onOpenChange={setShowAddVendor}
        onAddVendor={handleAddVendor}
      />

      {editingVendor && (
        <VendorEditModal
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSave={handleUpdateVendor}
        />
      )}
    </div>
  );
}