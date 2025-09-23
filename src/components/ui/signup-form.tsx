import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, X } from "lucide-react";

interface SignupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SignupForm = ({ open, onOpenChange }: SignupFormProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    monthlyRevenue: "",
    marketplaces: "",
    currentChallenges: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
    onOpenChange(false);
    // Redirect to dashboard
    navigate('/dashboard');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Start Your 7-Day Free Trial
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Get personalized cash flow insights for your Amazon business
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company/Brand Name</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monthlyRevenue">Monthly Amazon Revenue</Label>
            <Select onValueChange={(value) => handleInputChange("monthlyRevenue", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select revenue range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-9k">$0 - $9,000 (Free Plan)</SelectItem>
                <SelectItem value="10k-50k">$10,000 - $50,000 (Starter - $39/mo)</SelectItem>
                <SelectItem value="51k-99k">$51,000 - $99,000 (Professional - $79/mo)</SelectItem>
                <SelectItem value="100k-199k">$100,000 - $199,000 (Scale - $149/mo)</SelectItem>
                <SelectItem value="200k+">$200,000+ (Enterprise - $279/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="marketplaces">Amazon Marketplaces</Label>
            <Select onValueChange={(value) => handleInputChange("marketplaces", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">Amazon US</SelectItem>
                <SelectItem value="uk">Amazon UK</SelectItem>
                <SelectItem value="ca">Amazon Canada</SelectItem>
                <SelectItem value="eu">Amazon EU (Germany, France, Italy, Spain)</SelectItem>
                <SelectItem value="multiple">Multiple Marketplaces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              <span>7-day free trial, no credit card required</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              <span>Setup takes less than 5 minutes</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              <span>Cancel anytime during trial</span>
            </div>
          </div>
          
          <Button type="submit" className="w-full bg-gradient-primary">
            Start Free Trial
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};