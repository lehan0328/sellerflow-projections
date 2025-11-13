import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { Plus } from "lucide-react";
import { capitalizeName } from "@/lib/utils";

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVendor: (vendor: any) => void;
  existingVendors?: Array<{ name: string; id: string; }>;
  initialVendorName?: string;
}

export const VendorForm = ({ open, onOpenChange, onAddVendor, existingVendors = [], initialVendorName }: VendorFormProps) => {
  const { categories, addCategory, refetch: refetchCategories } = useCategories('purchase_order', false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    paymentMethod: "bank-transfer",
    paymentType: "total",
    depositAmount: "",
    netTermsDays: "30",
    customNetDays: ""
  });

  // Auto-fill vendor name when initialVendorName is provided
  useEffect(() => {
    if (initialVendorName && open) {
      setFormData(prev => ({
        ...prev,
        name: initialVendorName
      }));
    }
  }, [initialVendorName, open]);

  const paymentTypeOptions = [
    { value: 'total', label: 'Due Upon Order' },
    { value: 'net-terms', label: 'Net Terms' },
    { value: 'preorder', label: 'Preorder' },
    { value: 'delivery', label: 'Due Upon Delivery' }
  ];

  const netTermsOptions = [
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' },
    { value: 'custom', label: 'Custom Days' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission while adding category
    if (isAddingCategory) {
      return;
    }
    
    const capitalizedName = capitalizeName(formData.name);
    
    // Check for duplicate vendor name
    const duplicateVendor = existingVendors.find(
      vendor => vendor.name.toLowerCase() === capitalizedName.toLowerCase()
    );
    
    if (duplicateVendor) {
      toast.error(`Vendor "${capitalizedName}" already exists. Please use a different name.`);
      return;
    }
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }
    
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    
    // Validate net terms custom days if selected
    if (formData.paymentType === 'net-terms' && formData.netTermsDays === 'custom' && !formData.customNetDays) {
      toast.error("Please enter custom net terms days");
      return;
    }
    
    const vendor = {
      id: Date.now().toString(),
      name: capitalizedName,
      category: formData.category,
      paymentMethod: formData.paymentMethod, // Include payment method in vendor data
      paymentType: formData.paymentType,
      netTermsDays: formData.paymentType === 'net-terms' ? 
        (formData.netTermsDays === 'custom' ? formData.customNetDays : formData.netTermsDays) : 
        undefined
    };
    
    onAddVendor(vendor);
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: "",
      category: "",
      paymentMethod: "bank-transfer",
      paymentType: "total",
      depositAmount: "",
      netTermsDays: "30",
      customNetDays: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Add New Vendor
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name</Label>
              <Input
                id="name"
                placeholder="Enter vendor name"
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

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="bank-transfer"
                    name="paymentMethod"
                    value="bank-transfer"
                    checked={formData.paymentMethod === "bank-transfer"}
                    onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="bank-transfer" className="text-sm font-normal cursor-pointer">
                    Bank Transfer
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="credit-card"
                    name="paymentMethod"
                    value="credit-card"
                    checked={formData.paymentMethod === "credit-card"}
                    onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="credit-card" className="text-sm font-normal cursor-pointer">
                    Credit Card
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Payment Type</Label>
              <div className="space-y-3">
                {paymentTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={option.value}
                      name="paymentType"
                      value={option.value}
                      checked={formData.paymentType === option.value}
                      onChange={(e) => handleInputChange("paymentType", e.target.value)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                    />
                    <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>


              {formData.paymentType === 'net-terms' && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="netTermsDays">Net Terms</Label>
                  <div className="space-y-3">
                    {netTermsOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`net-${option.value}`}
                          name="netTermsDays"
                          value={option.value}
                          checked={formData.netTermsDays === option.value}
                          onChange={(e) => handleInputChange("netTermsDays", e.target.value)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                        />
                        <Label htmlFor={`net-${option.value}`} className="text-sm font-normal cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {formData.netTermsDays === 'custom' && (
                    <div className="mt-2">
                      <Label htmlFor="customNetDays">Custom Days</Label>
                      <Input
                        id="customNetDays"
                        type="number"
                        placeholder="Enter number of days"
                        value={formData.customNetDays}
                        onChange={(e) => handleInputChange("customNetDays", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-primary"
                disabled={!formData.name.trim() || !formData.category || isAddingCategory}
              >
                {isAddingCategory ? "Adding Category..." : "Okay - Create PO"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onAddCategory={async (name) => {
          setIsAddingCategory(true);
          try {
            const newCategory = await addCategory(name);
            if (newCategory) {
              // Wait for categories to refresh via realtime subscription
              await new Promise(resolve => setTimeout(resolve, 300));
              handleInputChange("category", name);
            }
          } finally {
            setIsAddingCategory(false);
          }
        }}
        type="purchase_order"
      />
    </>
  );
};