import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PartialPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  totalAmount: number;
  vendorName: string;
  poNumber: string;
  onConfirm: (data: {
    transactionId: string;
    amountPaid: number;
    remainingBalance: number;
    newDueDate: Date;
  }) => Promise<void>;
}

export const PartialPaymentModal = ({
  open,
  onOpenChange,
  transactionId,
  totalAmount,
  vendorName,
  poNumber,
  onConfirm,
}: PartialPaymentModalProps) => {
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingBalance = totalAmount - (parseFloat(amountPaid) || 0);

  const handleSubmit = async () => {
    const paid = parseFloat(amountPaid);
    
    if (!paid || paid <= 0 || paid >= totalAmount) {
      return;
    }

    if (!newDueDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        transactionId,
        amountPaid: paid,
        remainingBalance,
        newDueDate,
      });
      
      // Reset form
      setAmountPaid("");
      setNewDueDate(undefined);
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing partial payment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = 
    amountPaid && 
    parseFloat(amountPaid) > 0 && 
    parseFloat(amountPaid) < totalAmount && 
    newDueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark as Partially Paid</DialogTitle>
          <DialogDescription>
            Record a partial payment for {vendorName} - {poNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total Amount Display */}
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original Amount</span>
              <span className="text-lg font-semibold">${totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Amount Paid Input */}
          <div className="space-y-2">
            <Label htmlFor="amountPaid">Amount Paid *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amountPaid"
                type="number"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="pl-9"
                step="0.01"
                min="0"
                max={totalAmount}
              />
            </div>
            {amountPaid && parseFloat(amountPaid) >= totalAmount && (
              <p className="text-xs text-destructive">
                Amount paid must be less than total amount
              </p>
            )}
          </div>

          {/* Remaining Balance Display */}
          {amountPaid && parseFloat(amountPaid) > 0 && (
            <div className="rounded-lg border border-primary/20 p-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Remaining Balance</span>
                <span className="text-lg font-bold text-primary">
                  ${remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* New Due Date */}
          <div className="space-y-2">
            <Label htmlFor="newDueDate">New Due Date for Remaining Balance *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDueDate ? format(newDueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDueDate}
                  onSelect={setNewDueDate}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary */}
          {isValid && (
            <div className="rounded-lg border border-border p-3 bg-muted/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Amount Paid Now:</span>
                  <span className="font-semibold">${parseFloat(amountPaid).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold">${remainingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-semibold">{format(newDueDate!, "MMM dd, yyyy")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Confirm Partial Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
