import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useCustomers";
import { Users, Plus, Trash2, User, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

interface CustomerFormData {
  name: string;
  category: string;
}

const categories = [
  "Retail Partner",
  "Wholesale Client", 
  "Direct Consumer",
  "B2B Customer",
  "Distributor",
  "Other"
];

export function CustomerManagement() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string; category: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'a-z' | 'z-a'>('recent');
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    category: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
    });
  };

  const handleAddCustomer = async () => {
    if (!formData.name) {
      toast.error("Please enter a customer name");
      return;
    }

    try {
      await addCustomer({ 
        name: formData.name,
        paymentTerms: 'immediate',
        netTermsDays: undefined,
        category: formData.category
      });
      setShowAddDialog(false);
      resetForm();
      toast.success("Customer added successfully");
    } catch (error) {
      // Error already handled by useCustomers hook
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer({ id: customer.id, name: customer.name, category: customer.category || '' });
    setFormData({ name: customer.name, category: customer.category || '' });
    setShowEditDialog(true);
  };

  const handleUpdateCustomer = async () => {
    if (!formData.name || !editingCustomer) {
      toast.error("Please enter a customer name");
      return;
    }

    try {
      await updateCustomer(editingCustomer.id, { 
        name: formData.name,
        paymentTerms: 'immediate',
        netTermsDays: undefined,
        category: formData.category
      });
      setShowEditDialog(false);
      setEditingCustomer(null);
      resetForm();
    } catch (error) {
      // Error already handled by useCustomers hook
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteCustomer(customerId);
    } catch (error) {
      // Error already handled by useCustomers hook
    }
  };

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.category && customer.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort based on selected option
    switch (sortBy) {
      case 'recent':
        // Assuming most recently added are at the end, reverse the array
        filtered = [...filtered].reverse();
        break;
      case 'oldest':
        // Keep original order (oldest first)
        break;
      case 'a-z':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [customers, searchQuery, sortBy]);

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Customer Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading customers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <span>Customer Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-semibold">{customers.length}</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter customer name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCustomer} className="bg-gradient-primary">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Customer List */}
        {customers.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Customers ({customers.length})</h4>
            </div>
            
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
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

            {filteredAndSortedCustomers.length > 0 ? (
              <div className="space-y-2">
                {filteredAndSortedCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-full">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.category && (
                        <p className="text-xs text-muted-foreground">{customer.category}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Payment Terms: {customer.paymentTerms || 'immediate'}
                        {customer.netTermsDays && ` (Net ${customer.netTermsDays} days)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Active</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
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
                          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {customer.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCustomer(customer.id)}
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
                No customers match your search.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Customers Added</h3>
            <p className="text-muted-foreground mb-4">
              Add your first customer to start tracking income and payments
            </p>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter customer name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer} className="bg-gradient-primary">
                    Add Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Edit Customer Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Customer Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={formData.category}
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
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingCustomer(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCustomer} className="bg-gradient-primary">
                Update Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}