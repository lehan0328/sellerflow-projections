import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Building, Wallet, Plus } from "lucide-react";
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
      id: "checking",
      name: "Checking Account",
      icon: <Building className="h-6 w-6" />,
      description: "Connect your business checking account",
    },
    {
      id: "savings",
      name: "Savings Account", 
      icon: <Wallet className="h-6 w-6" />,
      description: "Connect your business savings account",
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

    // Here you would typically integrate with a service like Plaid or manually add the account
    toast.success("Account added successfully! It may take a few minutes to sync.");
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
                    <strong>Note:</strong> This is a demo version. In production, we'd integrate with Plaid or similar services for secure bank connections.
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
                    Add Account
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