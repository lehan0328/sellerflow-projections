import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2,
  Tag,
  CreditCard
} from "lucide-react";
import { VendorForm } from "@/components/cash-flow/vendor-form";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VendorEditFormData {
  name: string;
  category: string;
  paymentType: string;
  netTermsDays: string;
}

export function VendorManagement() {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editFormData, setEditFormData] = useState<VendorEditFormData>({
    name: "",
    category: "",
    paymentType: "total",
    netTermsDays: "30"
  });
  const { vendors, loading, addVendor, updateVendor, deleteVendor } = useVendors();
  
  // Filter to only show management vendors
  const managementVendors = vendors.filter(vendor => vendor.source === 'management');
  const { toast } = useToast();

  const categories = [
    "Inventory",
    "Packaging Materials", 
    "Marketing/PPC",
    "Shipping & Logistics",
    "Professional Services",
    "Other"
  ];

  const paymentTypeOptions = [
    { value: 'total', label: 'Due Upon Order' },
    { value: 'net-terms', label: 'Net Terms (30, 60, 90 days)' },
    { value: 'preorder', label: 'Pre-order with Deposit' }
  ];

  const handleAddVendor = async (vendorData: any) => {
    // Calculate due date based on payment terms
    let dueDate = new Date();
    if (vendorData.paymentType === 'net-terms' && vendorData.netTermsDays) {
      const days = parseInt(vendorData.netTermsDays);
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
    }
    
    await addVendor({
      name: vendorData.name,
      totalOwed: 0,
      nextPaymentDate: dueDate,
      nextPaymentAmount: 0,
      status: 'upcoming',
      category: vendorData.category || '',
      paymentType: vendorData.paymentType,
      netTermsDays: vendorData.netTermsDays,
      source: 'management'
    });
    setShowAddVendor(false);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditFormData({
      name: vendor.name,
      category: vendor.category || '',
      paymentType: vendor.paymentType || 'due-upon-order',
      netTermsDays: vendor.netTermsDays || '30'
    });
    setEditingVendor(vendor);
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor) return;
    
    await updateVendor(editingVendor.id, {
      name: editFormData.name,
      category: editFormData.category,
      paymentType: editFormData.paymentType as any,
      netTermsDays: editFormData.netTermsDays
    });
    setEditingVendor(null);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    // Check if vendor has associated transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('vendor_id', vendorId)
      .limit(1);
    
    if (transactions && transactions.length > 0) {
      toast({
        title: "Cannot Delete Vendor",
        description: "This vendor has associated transactions. Please remove all transactions first.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm('Are you sure you want to delete this vendor?')) {
      await deleteVendor(vendorId);
    }
  };

  const getPaymentTypeLabel = (paymentType: string) => {
    const option = paymentTypeOptions.find(opt => opt.value === paymentType);
    return option ? option.label : paymentType;
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
            Manage your vendor details and payment preferences
          </p>
        </div>
        <Button onClick={() => setShowAddVendor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {managementVendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No vendors yet</h4>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Add your first vendor to start managing their details and payment preferences
            </p>
            <Button onClick={() => setShowAddVendor(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {managementVendors.map((vendor) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(vendor)}
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
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {vendor.category && (
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>Category: {vendor.category}</span>
                    </div>
                  )}
                  {vendor.paymentType && (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>Payment Terms: {getPaymentTypeLabel(vendor.paymentType)}</span>
                      {vendor.paymentType === 'net-terms' && vendor.netTermsDays && (
                        <Badge variant="outline">Net {vendor.netTermsDays}</Badge>
                      )}
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
        <Dialog open={!!editingVendor} onOpenChange={(open) => !open && setEditingVendor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Vendor Name</Label>
                <Input
                  id="vendor-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-category">Category</Label>
                <Select 
                  value={editFormData.category} 
                  onValueChange={(value) => setEditFormData(prev => ({...prev, category: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-type">Default Payment Terms</Label>
                <Select 
                  value={editFormData.paymentType} 
                  onValueChange={(value) => setEditFormData(prev => ({...prev, paymentType: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editFormData.paymentType === 'net-terms' && (
                <div className="space-y-2">
                  <Label htmlFor="net-terms">Net Terms (Days)</Label>
                  <Select 
                    value={editFormData.netTermsDays} 
                    onValueChange={(value) => setEditFormData(prev => ({...prev, netTermsDays: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select net terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={() => setEditingVendor(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateVendor} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}