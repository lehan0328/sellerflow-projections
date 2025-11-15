import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayees, type Payee } from "@/hooks/usePayees";
import { useCategories } from "@/hooks/useCategories";
import { User, Plus, Trash2, Pencil, Search, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { capitalizeName, cn } from "@/lib/utils";

interface PayeeFormData {
  name: string;
  category: string;
  payment_method: string;
}

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'credit-card', label: 'Credit Card' }
];

export function PayeeManagement() {
  const { payees, isLoading, addPayee, updatePayee, deletePayee } = usePayees();
  const { categories: expenseCategories } = useCategories('expense', false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPayee, setEditingPayee] = useState<{ id: string; name: string; category: string; payment_method: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'a-z' | 'z-a'>('recent');
  const [formData, setFormData] = useState<PayeeFormData>({
    name: '',
    category: '',
    payment_method: 'bank-transfer'
  });

  const filteredAndSortedPayees = useMemo(() => {
    let filtered = payees.filter(payee =>
      payee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payee.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'z-a':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [payees, searchQuery, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a payee name");
      return;
    }

    try {
      await addPayee({
        name: capitalizeName(formData.name.trim()),
        category: formData.category || undefined,
        payment_method: formData.payment_method || undefined,
      });

      setFormData({
        name: '',
        category: '',
        payment_method: 'bank-transfer'
      });
      setShowAddDialog(false);
      toast.success("Payee added successfully");
    } catch (error) {
      console.error("Error adding payee:", error);
      toast.error("Failed to add payee");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPayee || !formData.name.trim()) {
      toast.error("Please enter a payee name");
      return;
    }

    try {
      await updatePayee(editingPayee.id, {
        name: capitalizeName(formData.name.trim()),
        category: formData.category || undefined,
        payment_method: formData.payment_method || undefined,
      });

      setShowEditDialog(false);
      setEditingPayee(null);
      setFormData({
        name: '',
        category: '',
        payment_method: 'bank-transfer'
      });
      toast.success("Payee updated successfully");
    } catch (error) {
      console.error("Error updating payee:", error);
      toast.error("Failed to update payee");
    }
  };

  const handleEdit = (payee: Payee) => {
    setEditingPayee({
      id: payee.id,
      name: payee.name,
      category: payee.category || '',
      payment_method: payee.payment_method || 'bank-transfer'
    });
    setFormData({
      name: payee.name,
      category: payee.category || '',
      payment_method: payee.payment_method || 'bank-transfer'
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deletePayee(id);
      toast.success(`Payee "${name}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting payee:", error);
      toast.error("Failed to delete payee");
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    if (method === 'credit-card') return <CreditCard className="h-4 w-4" />;
    return <CreditCard className="h-4 w-4" />;
  };

  const getPaymentMethodLabel = (method?: string) => {
    const option = paymentMethodOptions.find(opt => opt.value === method);
    return option?.label || 'Not specified';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5 text-primary" />
          <span>Payee Management</span>
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
              <p className="text-sm text-muted-foreground">Total Payees</p>
              <p className="text-2xl font-semibold">{payees.length}</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Payee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Payee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Payee Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter payee name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Payee</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search payees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="a-z">Name (A-Z)</SelectItem>
                <SelectItem value="z-a">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAndSortedPayees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No payees found</p>
              <p className="text-sm">
                {searchQuery ? "Try adjusting your search" : "Add your first payee to get started"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAndSortedPayees.map((payee) => (
                <Card key={payee.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{payee.name}</p>
                          {payee.category && (
                            <p className="text-xs text-muted-foreground">{payee.category}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getPaymentMethodIcon(payee.payment_method)}
                            <span>{getPaymentMethodLabel(payee.payment_method)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(payee)}
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
                              <AlertDialogTitle>Delete Payee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{payee.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(payee.id, payee.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Payee Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter payee name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingPayee(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Payee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
