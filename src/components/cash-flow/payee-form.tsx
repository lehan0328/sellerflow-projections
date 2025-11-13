import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { toast } from "sonner";

interface PayeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPayee: (payee: {
    name: string;
    category?: string;
    payment_method?: string;
    notes?: string;
  }) => Promise<void>;
  existingPayees: Array<{ name: string }>;
  initialPayeeName?: string;
  onCategoryAdded?: () => void;
}

export function PayeeForm({
  open,
  onOpenChange,
  onAddPayee,
  existingPayees,
  initialPayeeName = "",
  onCategoryAdded,
}: PayeeFormProps) {
  const [formData, setFormData] = useState({
    name: initialPayeeName,
    category: "",
    payment_method: "bank-transfer",
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const { categories: expenseCategories, addCategory } = useCategories('income', false);

  useEffect(() => {
    if (initialPayeeName) {
      setFormData(prev => ({ ...prev, name: initialPayeeName }));
    }
  }, [initialPayeeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter a payee name");
      return;
    }

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    // Check for duplicates
    const isDuplicate = existingPayees.some(
      (payee) => payee.name.toLowerCase() === formData.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast.error("A payee with this name already exists");
      return;
    }

    try {
      await onAddPayee({
        name: formData.name.trim(),
        category: formData.category || undefined,
        payment_method: formData.payment_method || undefined,
      });

      // Reset form
      setFormData({
        name: "",
        category: "",
        payment_method: "bank-transfer",
      });
      onOpenChange(false);
      toast.success("Payee added successfully");
    } catch (error) {
      console.error("Error adding payee:", error);
      toast.error("Failed to add payee");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNewCategory = async (categoryName: string) => {
    try {
      const newCategory = await addCategory(categoryName);
      if (newCategory) {
        onCategoryAdded?.();
        setFormData(prev => ({ ...prev, category: newCategory.name }));
        setShowAddCategory(false);
        toast.success("Category added successfully");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Payee</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payee Name */}
            <div className="space-y-2">
              <Label htmlFor="payee-name">Payee Name *</Label>
              <Input
                id="payee-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter payee name"
                required
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setShowAddCategory(true);
                  } else {
                    handleInputChange("category", value);
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <div className="border-b pb-1 mb-1">
                    <SelectItem value="__add_new__" className="text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Category
                      </div>
                    </SelectItem>
                  </div>
                  {expenseCategories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.name}</span>
                        {category.is_default && (
                          <span className="text-xs text-muted-foreground ml-2">(default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                value={formData.payment_method}
                onValueChange={(value) => handleInputChange("payment_method", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                  <Label htmlFor="bank-transfer" className="font-normal cursor-pointer">
                    Bank Transfer
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit-card" id="credit-card" />
                  <Label htmlFor="credit-card" className="font-normal cursor-pointer">
                    Credit Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Payee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onAddCategory={handleAddNewCategory}
        type="income"
      />
    </>
  );
}
