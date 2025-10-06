import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";

interface EnterpriseSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseSetupModal({ open, onOpenChange }: EnterpriseSetupModalProps) {
  const handleScheduleSetup = () => {
    window.open("https://app.usemotion.com/meet/andy-chu/enterprise", "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Welcome to Auren Enterprise!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your 7-day free trial has started. To help you get the most out of Auren, 
            we'd like to schedule a personalized setup session with our team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <h4 className="font-semibold">What you'll get:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Personalized onboarding and account setup</li>
              <li>✓ Best practices for your specific business needs</li>
              <li>✓ Connect all your accounts with guidance</li>
              <li>✓ Q&A with our team</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleScheduleSetup}
              className="w-full bg-gradient-primary"
              size="lg"
            >
              Schedule Setup Session
            </Button>
            <Button 
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="w-full"
            >
              I'll do it later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
