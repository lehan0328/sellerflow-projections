import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { Building2, Plus, Trash2, Pencil, Search, CreditCard, Banknote, DollarSign, FileText, Landmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { capitalizeName, cn } from "@/lib/utils";

interface VendorFormData {
  name: string;
  category: string;
  paymentType: string;
  paymentMethod: string;
  netTermsDays: string;
}

const categories = [
  "Inventory",
  "Packaging Materials", 
  "Marketing/PPC",
  "Shipping & Logistics",
  "Professional Services",
  "Other"
];

const paymentTypeOptions = [
  { value: 'due-upon-order', label: 'Due Upon Order' },
  { value: 'net-terms', label: 'Net Terms' },
  { value: 'preorder', label: 'Preorder' },
  { value: 'due-upon-delivery', label: 'Due Upon Delivery' }
];

const paymentMethodOptions = [
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'credit-card', label: 'Credit Card' }
];

export function VendorManagement() {
  const { vendors, loading, addVendor, updateVendor, deleteVendor } = useVendors();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<{ id: string; name: string; category: string; paymentType: string; paymentMethod: string; netTermsDays: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'a-z' | 'z-a'>('recent');
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    category: '',
    paymentType: 'due-upon-order',
    paymentMethod: 'bank-transfer',
    netTermsDays: '30'
  });

  // Filter to only show management vendors
  const managementVendors = vendors.filter(vendor => vendor.source === 'management');

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      paymentType: 'due-upon-order',
      paymentMethod: 'bank-transfer',
      netTermsDays: '30'
    });
  };

  const handleAddVendor = async () => {
    if (!formData.name) {
      toast.error("Please enter a vendor name");
      return;
    }

    try {
      let dueDate = new Date();
      if (formData.paymentType === 'net-terms' && formData.netTermsDays) {
        const days = parseInt(formData.netTermsDays);
        dueDate.setDate(dueDate.getDate() + days);
      }

      await addVendor({
        name: capitalizeName(formData.name),
        totalOwed: 0,
        nextPaymentDate: dueDate,
        nextPaymentAmount: 0,
        status: 'upcoming',
        category: formData.category,
        paymentType: formData.paymentType as any,
        paymentMethod: formData.paymentMethod as any,
        netTermsDays: formData.netTermsDays,
        source: 'management'
      });
      setShowAddDialog(false);
      resetForm();
      toast.success("Vendor added successfully");
    } catch (error) {
      // Error already handled by useVendors hook
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor({ 
      id: vendor.id, 
      name: vendor.name, 
      category: vendor.category || '',
      paymentType: vendor.paymentType || 'due-upon-order',
      paymentMethod: vendor.paymentMethod || 'bank-transfer',
      netTermsDays: vendor.netTermsDays || '30'
    });
    setFormData({ 
      name: vendor.name, 
      category: vendor.category || '',
      paymentType: vendor.paymentType || 'due-upon-order',
      paymentMethod: vendor.paymentMethod || 'bank-transfer',
      netTermsDays: vendor.netTermsDays || '30'
    });
    setShowEditDialog(true);
  };

  const handleUpdateVendor = async () => {
    if (!formData.name || !editingVendor) {
      toast.error("Please enter a vendor name");
      return;
    }

    try {
      await updateVendor(editingVendor.id, {
        name: capitalizeName(formData.name),
        category: formData.category,
        paymentType: formData.paymentType as any,
        paymentMethod: formData.paymentMethod as any,
        netTermsDays: formData.netTermsDays
      });
      setShowEditDialog(false);
      setEditingVendor(null);
      resetForm();
    } catch (error) {
      // Error already handled by useVendors hook
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('vendor_id', vendorId)
        .limit(1);
      
      if (transactions && transactions.length > 0) {
        toast.error("Cannot delete vendor with associated transactions");
        return;
      }

      await deleteVendor(vendorId);
    } catch (error) {
      // Error already handled by useVendors hook
    }
  };

  const getPaymentTypeLabel = (paymentType: string, netTermsDays?: string) => {
    const option = paymentTypeOptions.find(opt => opt.value === paymentType);
    const label = option ? option.label : paymentType;
    if (paymentType === 'net-terms' && netTermsDays) {
      return `${label} (Net ${netTermsDays} days)`;
    }
    return label;
  };

  const getPaymentMethodLabel = (paymentMethod?: string) => {
    const option = paymentMethodOptions.find(opt => opt.value === paymentMethod);
    return option ? option.label : 'Bank Transfer';
  };

  const getPaymentMethodIcon = (paymentMethod?: string) => {
    switch (paymentMethod) {
      case 'credit-card':
        return CreditCard;
      case 'bank-transfer':
      default:
        return Landmark;
    }
  };

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = managementVendors.filter(vendor =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.category && vendor.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    switch (sortBy) {
      case 'recent':
        filtered = [...filtered].reverse();
        break;
      case 'oldest':
        break;
      case 'a-z':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [managementVendors, searchQuery, sortBy]);

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Vendor Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading vendors...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span>Vendor Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-semibold">{managementVendors.length}</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Vendor Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter vendor name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <div>
                  <Label htmlFor="paymentType">Payment Terms</Label>
                  <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value })}>
                    <SelectTrigger>
                      <SelectValue />
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
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.paymentType === 'net-terms' && (
                  <div>
                    <Label htmlFor="netTermsDays">Net Terms (Days)</Label>
                    <Select value={formData.netTermsDays} onValueChange={(value) => setFormData({ ...formData, netTermsDays: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddVendor} className="bg-gradient-primary">
                  Add Vendor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vendor List */}
        {managementVendors.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Vendors ({managementVendors.length})</h4>
            </div>
            
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="a-z">A-Z</SelectItem>
                  <SelectItem value="z-a">Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredAndSortedVendors.length > 0 ? (
              <div className="space-y-2">
                {filteredAndSortedVendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Building2 className="h-4 w-4" />
                      </div>
                       <div>
                         <p className="font-medium">{vendor.name}</p>
                         {vendor.category && (
                           <p className="text-xs text-muted-foreground">{vendor.category}</p>
                         )}
                         <p className="text-sm text-muted-foreground">
                           Payment Terms: {getPaymentTypeLabel(vendor.paymentType || 'due-upon-order', vendor.netTermsDays)}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const PaymentIcon = getPaymentMethodIcon(vendor.paymentMethod);
                        const isCard = vendor.paymentMethod === 'credit-card';
                        return (
                          <div className={cn(
                            "p-2 rounded-full",
                            isCard ? "bg-blue-100 dark:bg-blue-950" : "bg-green-100 dark:bg-green-950"
                          )}>
                            <PaymentIcon className={cn(
                              "h-4 w-4",
                              isCard ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
                            )} />
                          </div>
                        );
                      })()}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVendor(vendor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {vendor.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No vendors match your search.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Vendors Added</h3>
            <p className="text-muted-foreground mb-4">
              Add your first vendor to start tracking payments
            </p>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Vendor Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter vendor name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                  <div>
                    <Label htmlFor="paymentType">Payment Terms</Label>
                    <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value })}>
                      <SelectTrigger>
                        <SelectValue />
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
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.paymentType === 'net-terms' && (
                    <div>
                      <Label htmlFor="netTermsDays">Net Terms (Days)</Label>
                      <Select value={formData.netTermsDays} onValueChange={(value) => setFormData({ ...formData, netTermsDays: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                          <SelectItem value="90">90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVendor} className="bg-gradient-primary">
                    Add Vendor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>

      {/* Edit Vendor Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Vendor Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter vendor name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select 
                value={formData.category || undefined}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
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
            <div>
              <Label htmlFor="edit-paymentType">Payment Terms</Label>
              <Select 
                value={formData.paymentType}
                onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label htmlFor="edit-paymentMethod">Payment Method</Label>
              <Select 
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.paymentType === 'net-terms' && (
              <div>
                <Label htmlFor="edit-netTermsDays">Net Terms (Days)</Label>
                <Select 
                  value={formData.netTermsDays}
                  onValueChange={(value) => setFormData({ ...formData, netTermsDays: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingVendor(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVendor} className="bg-gradient-primary">
              Update Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}