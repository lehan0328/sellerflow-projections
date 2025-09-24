import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitIncome: (incomeData: any) => void;
  isRecurring?: boolean;
}

export const IncomeForm = ({ open, onOpenChange, onSubmitIncome, isRecurring = false }: IncomeFormProps) => {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    paymentDate: undefined as Date | undefined,
    source: "",
    category: "",
    notes: "",
    isRecurring: isRecurring,
    recurringFrequency: "monthly" as "weekly" | "monthly" | "quarterly" | "yearly"
  });

  const categories = [
    "Product Sales",
    "Service Revenue", 
    "Subscription",
    "Consulting",
    "License Fees",
    "Investment Returns",
    "Other"
  ];

  const sources = [
    "Amazon",
    "Direct Sales",
    "Stripe",
    "PayPal",
    "Bank Transfer",
    "Cash",
    "Other"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const incomeData = {
      id: Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate || new Date(),
      status: 'pending'
    };
    
    console.log("Submitting income:", incomeData);
    onSubmitIncome(incomeData);
    toast.success(`${isRecurring ? 'Recurring ' : ''}Income "${formData.description}" added successfully!`);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      description: "",
      amount: "",
      paymentDate: undefined,
      source: "",
      category: "",
      notes: "",
      isRecurring: isRecurring,
      recurringFrequency: "monthly"
    });
  };

  const handleInputChange = (field: string, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isRecurring ? 'Add Recurring Income' : 'Add Income'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g., Monthly subscription revenue"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.paymentDate ? format(formData.paymentDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.paymentDate}
                  onSelect={(date) => handleInputChange("paymentDate", date || new Date())}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select onValueChange={(value) => handleInputChange("source", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select income source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {!isRecurring && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleInputChange("isRecurring", checked as boolean)}
              />
              <Label htmlFor="isRecurring">Make this a recurring income</Label>
            </div>
          )}

          {(formData.isRecurring || isRecurring) && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Recurring Frequency</Label>
              <Select 
                value={formData.recurringFrequency}
                onValueChange={(value) => handleInputChange("recurringFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or details"
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
              Add {isRecurring ? 'Recurring ' : ''}Income
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};