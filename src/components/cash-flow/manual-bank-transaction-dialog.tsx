import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualBankTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; account_name: string; institution_name: string; accountType: 'bank' | 'credit' }>;
  onSuccess?: () => void;
}

export function ManualBankTransactionDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: ManualBankTransactionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accountType, setAccountType] = useState<'bank' | 'credit'>('bank');
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [merchantName, setMerchantName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"debit" | "credit">("debit");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountId || !amount || !merchantName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert amount to negative for debits (money out)
      const numAmount = parseFloat(amount);
      const finalAmount = transactionType === "debit" ? -Math.abs(numAmount) : Math.abs(numAmount);

      // Insert based on account type
      const insertData: any = {
        user_id: user.id,
        amount: finalAmount,
        date: format(date, 'yyyy-MM-dd'),
        name: merchantName,
        merchant_name: merchantName,
        pending: false,
        iso_currency_code: 'USD',
        transaction_type: transactionType === "debit" ? "purchase" : "deposit",
      };

      if (accountType === 'bank') {
        insertData.bank_account_id = accountId;
        const { error } = await supabase
          .from('bank_transactions')
          .insert([insertData]);
        
        if (error) throw error;
      } else {
        insertData.credit_card_id = accountId;
        const { error } = await supabase
          .from('bank_transactions')
          .insert([insertData]);
        
        if (error) throw error;
      }

      toast({
        title: "Transaction created",
        description: "Manual bank transaction added successfully",
      });

      // Reset form
      setAccountId("");
      setAmount("");
      setDate(new Date());
      setMerchantName("");
      setDescription("");
      setTransactionType("debit");
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Bank Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account *</Label>
            <Select value={accountId} onValueChange={(value) => {
              setAccountId(value);
              const selectedAccount = accounts.find(acc => acc.id === value);
              setAccountType(selectedAccount?.accountType || 'bank');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter(acc => acc.accountType === 'bank')
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.institution_name} - {account.account_name}
                    </SelectItem>
                  ))}
                {accounts.filter(acc => acc.accountType === 'credit').length > 0 && (
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Credit Cards</div>
                )}
                {accounts
                  .filter(acc => acc.accountType === 'credit')
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.institution_name} - {account.account_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionType">Transaction Type *</Label>
            <Select value={transactionType} onValueChange={(val: "debit" | "credit") => setTransactionType(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit (Money Out)</SelectItem>
                <SelectItem value="credit">Credit (Money In)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantName">Merchant Name *</Label>
            <Input
              id="merchantName"
              placeholder="e.g., Amazon, Walmart"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Additional details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
