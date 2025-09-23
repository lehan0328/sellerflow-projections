import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Building, Wallet, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAccountModal = ({ open, onOpenChange }: AddAccountModalProps) => {
  const [selectedType, setSelectedType] = useState<string>("");
  const [formData, setFormData] = useState({
    accountName: "",
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    creditLimit: "",
    interestRate: "",
  });

  const accountTypes = [
    {
      id: "plaid",
      name: "Bank Account (Plaid)",
      icon: <Building className="h-6 w-6" />,
      description: "Securely connect your bank account via Plaid",
    },
    {
      id: "amazon",
      name: "Amazon Account", 
      icon: <ShoppingCart className="h-6 w-6" />,
      description: "Connect your Amazon Seller Central account",
    },
    {
      id: "credit",
      name: "Credit Card",
      icon: <CreditCard className="h-6 w-6" />,
      description: "Add business credit card for tracking",
    },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!selectedType || !formData.accountName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedType === 'plaid') {
      // Simulate Plaid Link flow
      toast.success("Redirecting to Plaid for secure bank connection...");
      setTimeout(() => {
        toast.success("Bank account connected successfully via Plaid!");
      }, 2000);
    } else if (selectedType === 'amazon') {
      // Simulate Amazon connection
      toast.success("Connecting to Amazon Seller Central...");
      setTimeout(() => {
        toast.success("Amazon account connected successfully!");
      }, 2000);
    } else {
      toast.success("Credit card added successfully!");
    }
    
    onOpenChange(false);
    
    // Reset form
    setSelectedType("");
    setFormData({
      accountName: "",
      accountNumber: "",
      routingNumber: "",
      bankName: "",
      creditLimit: "",
      interestRate: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Account</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!selectedType ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose the type of account you'd like to add:
              </p>
              <div className="space-y-3">
                {accountTypes.map((type) => (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {type.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{type.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("")}
                >
                  ← Back
                </Button>
                <span className="font-medium">
                  {accountTypes.find(t => t.id === selectedType)?.name}
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input
                    id="accountName"
                    placeholder="e.g., Business Checking"
                    value={formData.accountName}
                    onChange={(e) => handleInputChange('accountName', e.target.value)}
                  />
                </div>

                {selectedType === "credit" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="creditLimit">Credit Limit</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        placeholder="25000"
                        value={formData.creditLimit}
                        onChange={(e) => handleInputChange('creditLimit', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.01"
                        placeholder="18.99"
                        value={formData.interestRate}
                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      />
                    </div>
                  </>
                ) : selectedType === "plaid" ? (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Plaid Integration:</strong> You'll be redirected to Plaid's secure interface to connect your bank account.
                    </p>
                    <p className="text-xs text-blue-600">
                      Plaid uses bank-level security to protect your information and never stores your login credentials.
                    </p>
                  </div>
                ) : selectedType === "amazon" ? (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800 mb-2">
                      <strong>Amazon Integration:</strong> Connect your Amazon Seller Central account to automatically sync payouts and expenses.
                    </p>
                    <div className="space-y-2 mt-3">
                      <div>
                        <Label htmlFor="marketplace">Marketplace</Label>
                        <Select onValueChange={(value) => handleInputChange('marketplace', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marketplace" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">United States (amazon.com)</SelectItem>
                            <SelectItem value="ca">Canada (amazon.ca)</SelectItem>
                            <SelectItem value="uk">United Kingdom (amazon.co.uk)</SelectItem>
                            <SelectItem value="de">Germany (amazon.de)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g., Chase Bank"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number (Last 4 digits)</Label>
                      <Input
                        id="accountNumber"
                        placeholder="1234"
                        maxLength={4}
                        value={formData.accountNumber}
                        onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        placeholder="123456789"
                        maxLength={9}
                        value={formData.routingNumber}
                        onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                      />
                     </div>
                   </>
                 )}

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> This is a demo version. In production, we'd integrate with the actual services for secure connections.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-gradient-primary"
                  >
                    {selectedType === 'plaid' ? 'Connect via Plaid' : 
                     selectedType === 'amazon' ? 'Connect Amazon Account' : 
                     'Add Account'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};