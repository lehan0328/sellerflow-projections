import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmbeddedCheckout } from "./EmbeddedCheckout";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceId: string;
}

export function CheckoutModal({ open, onOpenChange, priceId }: CheckoutModalProps) {
  const handleSuccess = () => {
    window.location.href = "/dashboard?payment=success";
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Your Free Trial</DialogTitle>
          <DialogDescription>
            Enter your payment details to start your 7-day free trial. You won't be charged until after the trial period.
          </DialogDescription>
        </DialogHeader>
        <EmbeddedCheckout 
          priceId={priceId} 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
