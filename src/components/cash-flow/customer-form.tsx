import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCustomer: (customer: any) => void;
}

export const CustomerForm = ({ open, onOpenChange, onAddCustomer }: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    paymentTerms: "immediate",
    netTermsDays: "30",
    customNetDays: "",
    address: "",
    notes: ""
  });

  const categories = [
    "Retail Partner",
    "Wholesale Client", 
    "Direct Consumer",
    "B2B Customer",
    "Distributor",
    "Other"
  ];

  const paymentTermsOptions = [
    { value: 'immediate', label: 'Immediate Payment' },
    { value: 'net', label: 'Net Terms' }
  ];

  const netTermsOptions = [
    { value: '15', label: '15 Days' },
    { value: '30', label: '30 Days' },
    { value: '45', label: '45 Days' },
    { value: '60', label: '60 Days' },
    { value: 'custom', label: 'Custom Days' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const customer = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      category: formData.category,
      paymentTerms: formData.paymentTerms,
      netTermsDays: formData.paymentTerms === 'net' ? 
        (formData.netTermsDays === 'custom' ? formData.customNetDays : formData.netTermsDays) : 
        undefined,
      address: formData.address,
      notes: formData.notes
    };
    
    onAddCustomer(customer);
    
    // Show success toast
    toast.success(`Customer "${formData.name}" added successfully!`);
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      category: "",
      paymentTerms: "immediate",
      netTermsDays: "30",
      customNetDays: "",
      address: "",
      notes: ""
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
            Add New Customer
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
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
            <Label>Payment Terms</Label>
            <div className="space-y-3">
              {paymentTermsOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={option.value}
                    name="paymentTerms"
                    value={option.value}
                    checked={formData.paymentTerms === option.value}
                    onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>

            {formData.paymentTerms === 'net' && (
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

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Textarea
              id="address"
              placeholder="Enter customer address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about customer"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
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
      </DialogContent>
    </Dialog>
  );
};