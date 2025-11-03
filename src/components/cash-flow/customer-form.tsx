import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCustomer: (customer: any) => void;
}

export const CustomerForm = ({ open, onOpenChange, onAddCustomer }: CustomerFormProps) => {
  const { categories, addCategory, refetch: refetchCategories } = useCategories('income');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const customer = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category
    };
    
    onAddCustomer(customer);
    
    // Show success toast
    toast.success(`Customer "${formData.name}" added successfully!`);
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: "",
      category: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[55]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add New Customer
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category}
              onValueChange={(value) => {
                if (value === "__add_new__") {
                  setShowAddCategory(true);
                } else {
                  handleInputChange("category", value);
                }
              }}
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
                {categories.map(category => (
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
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary">
              Add Customer
            </Button>
          </div>
        </form>

        <AddCategoryDialog
          open={showAddCategory}
          onOpenChange={setShowAddCategory}
          onAddCategory={async (name) => {
            await addCategory(name);
            await refetchCategories();
            setFormData(prev => ({
              ...prev,
              category: name
            }));
          }}
          type="income"
        />
      </DialogContent>
    </Dialog>
  );
};