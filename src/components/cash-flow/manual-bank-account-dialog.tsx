import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ManualBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: {
    id: string;
    institution_name: string;
    account_name: string;
    account_type: string;
    balance: number;
    available_balance: number;
    currency_code: string;
  } | null;
  onSuccess?: () => void;
}

export function ManualBankAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess
}: ManualBankAccountDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institution_name: account?.institution_name || "",
    account_name: account?.account_name || "",
    account_type: account?.account_type || "checking",
    balance: account?.balance?.toString() || "0",
    available_balance: account?.available_balance?.toString() || "0",
    currency_code: account?.currency_code || "USD"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        user_id: user.id,
        institution_name: formData.institution_name.trim(),
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        balance: parseFloat(formData.balance) || 0,
        available_balance: parseFloat(formData.available_balance) || 0,
        currency_code: formData.currency_code,
        is_active: true,
        last_sync: new Date().toISOString()
      };

      if (account) {
        // Update existing account
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', account.id);

        if (error) throw error;
        toast.success("Bank account updated successfully");
      } else {
        // Create new manual account
        const { error } = await supabase
          .from('bank_accounts')
          .insert(accountData);

        if (error) throw error;
        toast.success("Bank account added successfully");
      }

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        institution_name: "",
        account_name: "",
        account_type: "checking",
        balance: "0",
        available_balance: "0",
        currency_code: "USD"
      });
    } catch (error: any) {
      console.error("Error saving bank account:", error);
      toast.error(error.message || "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit Bank Account" : "Add Manual Bank Account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="institution_name">Bank/Institution Name *</Label>
            <Input
              id="institution_name"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              placeholder="e.g., Chase, Bank of America"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g., Business Checking, Savings"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type *</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => setFormData({ ...formData, account_type: value })}
            >
              <SelectTrigger id="account_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="money market">Money Market</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_balance">Available Balance</Label>
              <Input
                id="available_balance"
                type="number"
                step="0.01"
                value={formData.available_balance}
                onChange={(e) => setFormData({ ...formData, available_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency_code">Currency</Label>
            <Select
              value={formData.currency_code}
              onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
            >
              <SelectTrigger id="currency_code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : account ? "Update Account" : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
