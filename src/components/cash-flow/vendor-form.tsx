import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVendor: (vendor: any) => void;
}

export const VendorForm = ({ open, onOpenChange, onAddVendor }: VendorFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    paymentType: "total",
    depositAmount: "",
    netTermsDays: "30",
    customNetDays: ""
  });

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

  const netTermsOptions = [
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' },
    { value: 'custom', label: 'Custom Days' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vendor = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      paymentType: formData.paymentType,
      netTermsDays: formData.paymentType === 'net-terms' ? 
        (formData.netTermsDays === 'custom' ? formData.customNetDays : formData.netTermsDays) : 
        undefined
    };
    
    onAddVendor(vendor);
    
    // Show success toast
    toast.success(`Vendor "${formData.name}" added successfully!`);
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: "",
      category: "",
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
            <Select onValueChange={(value) => handleInputChange("category", value)}>
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
            <Button type="submit" className="flex-1 bg-gradient-primary">
              Add Vendor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};