import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, AlertCircle } from "lucide-react";

interface CreditCardPriorityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: string;
  cardId: string;
  onSave: (cardId: string, priority: number) => Promise<void>;
}

export function CreditCardPriorityDialog({
  open,
  onOpenChange,
  cardName,
  cardId,
  onSave,
}: CreditCardPriorityDialogProps) {
  const [priority, setPriority] = useState<string>("3");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(cardId, parseInt(priority));
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving priority:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Set Card Priority
          </DialogTitle>
          <DialogDescription>
            Set payment priority for <strong>{cardName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">What is card priority?</p>
              <p className="text-blue-700 dark:text-blue-300">
                Priority determines which cards to use first for purchases to maximize rewards and cashback. Use highest priority cards for everyday spending.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Payment Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">1 - Highest Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Use first (best rewards/cashback)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">2 - High Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Use second (good rewards)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">3 - Normal Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Standard usage
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">4 - Low Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Use less often
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">5 - Lowest Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Use last (lowest rewards)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Priority"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
