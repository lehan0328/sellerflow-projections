import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ManualCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: {
    id: string;
    institution_name: string;
    account_name: string;
    balance: number;
    credit_limit: number;
    minimum_payment: number;
    annual_fee: number;
    payment_due_date: string | null;
    statement_close_date: string | null;
    currency_code: string;
  } | null;
  onSuccess?: () => void;
}

export function ManualCreditCardDialog({
  open,
  onOpenChange,
  card,
  onSuccess
}: ManualCreditCardDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institution_name: card?.institution_name || "",
    account_name: card?.account_name || "",
    balance: card?.balance?.toString() || "0",
    credit_limit: card?.credit_limit?.toString() || "0",
    minimum_payment: card?.minimum_payment?.toString() || "0",
    annual_fee: card?.annual_fee?.toString() || "0",
    payment_due_date: card?.payment_due_date || "",
    statement_close_date: card?.statement_close_date || "",
    currency_code: card?.currency_code || "USD"
  });

  useEffect(() => {
    if (card) {
      setFormData({
        institution_name: card.institution_name,
        account_name: card.account_name,
        balance: card.balance.toString(),
        credit_limit: card.credit_limit.toString(),
        minimum_payment: card.minimum_payment.toString(),
        annual_fee: card.annual_fee.toString(),
        payment_due_date: card.payment_due_date || "",
        statement_close_date: card.statement_close_date || "",
        currency_code: card.currency_code
      });
    } else {
      setFormData({
        institution_name: "",
        account_name: "",
        balance: "0",
        credit_limit: "0",
        minimum_payment: "0",
        annual_fee: "0",
        payment_due_date: "",
        statement_close_date: "",
        currency_code: "USD"
      });
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      const creditCardData = {
        institution_name: formData.institution_name,
        account_name: formData.account_name,
        account_type: 'credit',
        balance: parseFloat(formData.balance),
        credit_limit: parseFloat(formData.credit_limit),
        available_credit: parseFloat(formData.credit_limit) - parseFloat(formData.balance),
        minimum_payment: parseFloat(formData.minimum_payment),
        annual_fee: parseFloat(formData.annual_fee),
        payment_due_date: formData.payment_due_date || null,
        statement_close_date: formData.statement_close_date || null,
        currency_code: formData.currency_code,
        account_id: profile.account_id
      };

      if (card) {
        // Update existing card
        const { error } = await supabase
          .from('credit_cards')
          .update(creditCardData)
          .eq('id', card.id);

        if (error) throw error;
        toast.success("Credit card updated successfully");
      } else {
        // Create new card
        const { error } = await supabase
          .from('credit_cards')
          .insert({
            ...creditCardData,
            user_id: user.id
          });

        if (error) throw error;
        toast.success("Credit card added successfully");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving credit card:', error);
      toast.error(error.message || "Failed to save credit card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {card ? "Edit Credit Card" : "Add Manual Credit Card"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="institution_name">Bank/Institution Name *</Label>
            <Input
              id="institution_name"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              placeholder="e.g. Chase, Amex, Capital One"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Card Name *</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g. Sapphire Preferred, Platinum"
              required
            />
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
              <Label htmlFor="credit_limit">Credit Limit *</Label>
              <Input
                id="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimum_payment">Minimum Payment</Label>
              <Input
                id="minimum_payment"
                type="number"
                step="0.01"
                value={formData.minimum_payment}
                onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annual_fee">Annual Fee</Label>
              <Input
                id="annual_fee"
                type="number"
                step="0.01"
                value={formData.annual_fee}
                onChange={(e) => setFormData({ ...formData, annual_fee: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_due_date">Payment Due Date</Label>
              <Input
                id="payment_due_date"
                type="date"
                value={formData.payment_due_date}
                onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement_close_date">Statement Close Date</Label>
              <Input
                id="statement_close_date"
                type="date"
                value={formData.statement_close_date}
                onChange={(e) => setFormData({ ...formData, statement_close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency_code">Currency</Label>
            <Select 
              value={formData.currency_code} 
              onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
            >
              <SelectTrigger>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : card ? "Update Card" : "Add Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
