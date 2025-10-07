import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/hooks/useSubscription";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TrialExpiredModal = ({ open }: { open: boolean }) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Your Trial Has Ended</DialogTitle>
          </div>
          <DialogDescription>
            Your free trial has expired. Please choose a plan to continue using Auren.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {Object.entries(PRICING_PLANS).map(([key, plan]) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ${plan.price}/month
                </p>
              </div>
              <Button onClick={() => navigate('/upgrade-plan')}>
                Select Plan
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
