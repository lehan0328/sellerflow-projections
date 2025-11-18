import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CreditCard as CreditCardIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface CreditCard {
  id: string;
  account_name: string;
  balance: number;
  credit_limit: number;
  credit_limit_override?: number | null;
  available_credit: number;
  is_active: boolean;
  priority?: number | null;
}

interface CreditCardSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  creditCards: CreditCard[];
  creditCardPendingAmounts: Map<string, number>;
  amount: number;
  allowSplit?: boolean;
  splitEnabled?: boolean;
  onSplitToggle?: (enabled: boolean) => void;
  className?: string;
}

export const CreditCardSelect: React.FC<CreditCardSelectProps> = ({
  value,
  onChange,
  creditCards,
  creditCardPendingAmounts,
  amount,
  allowSplit = false,
  splitEnabled = false,
  onSplitToggle,
  className
}) => {
  const activeCards = creditCards.filter(card => card.is_active).sort((a, b) => (a.priority || 3) - (b.priority || 3));
  const isSplit = Array.isArray(value);
  const selectedCardIds = isSplit ? value : (value ? [value] : []);

  const calculateAvailableCredit = (card: CreditCard) => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    const pendingCommitments = creditCardPendingAmounts.get(card.id) || 0;
    return effectiveLimit - card.balance - pendingCommitments;
  };

  const renderCardOption = (card: CreditCard) => {
    const availableCredit = calculateAvailableCredit(card);
    return (
      <SelectItem key={card.id} value={card.id}>
        <div className="flex items-center gap-2 w-full">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {card.priority || 3}
          </span>
          <span className="font-medium">{card.account_name}</span>
          <span className="text-sm text-muted-foreground ml-auto">
            {formatCurrency(availableCredit)}
          </span>
        </div>
      </SelectItem>
    );
  };

  const renderSingleCardInfo = () => {
    if (!value || isSplit) return null;
    
    const selectedCard = creditCards.find(card => card.id === value);
    if (!selectedCard) return null;

    const effectiveLimit = selectedCard.credit_limit_override || selectedCard.credit_limit;
    const availableCredit = calculateAvailableCredit(selectedCard);
    const remainingCredit = availableCredit - amount;
    const hasInsufficientCredit = availableCredit < amount;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background p-2 rounded border">
        <CreditCardIcon className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <div className="font-medium">{selectedCard.account_name}</div>
          <div className="flex gap-2 mt-1">
            <span>Available: {formatCurrency(availableCredit)}</span>
            {amount > 0 && (
              <span className={cn(
                "font-medium",
                hasInsufficientCredit ? "text-destructive" : 
                remainingCredit < 1000 ? "text-yellow-600" : 
                "text-green-600"
              )}>
                • After: {formatCurrency(remainingCredit)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSplitCardInfo = () => {
    if (!isSplit || selectedCardIds.length === 0) return null;

    return (
      <div className="space-y-2">
        {selectedCardIds.map(cardId => {
          const card = creditCards.find(c => c.id === cardId);
          if (!card) return null;

          const effectiveLimit = card.credit_limit_override || card.credit_limit;
          const availableCredit = calculateAvailableCredit(card);
          
          return (
            <div key={card.id} className="text-sm bg-muted/50 p-2 rounded">
              <div className="flex justify-between font-medium">
                <span>{card.account_name}</span>
                <span>Available: {formatCurrency(availableCredit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {allowSplit && onSplitToggle && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Split Payment</Label>
            <p className="text-xs text-muted-foreground">Pay with multiple credit cards</p>
          </div>
          <Switch
            checked={splitEnabled}
            onCheckedChange={onSplitToggle}
          />
        </div>
      )}

      {!splitEnabled ? (
        <>
          <div className="space-y-2">
            <Label>Select Credit Card</Label>
            <Select value={isSplit ? "" : value as string} onValueChange={(v) => onChange(v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose a credit card" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {activeCards.map(renderCardOption)}
              </SelectContent>
            </Select>
          </div>
          {renderSingleCardInfo()}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Select Credit Cards (Multiple)</Label>
            <Select 
              value={selectedCardIds.length > 0 ? "multiple" : ""} 
              onValueChange={(cardId) => {
                if (!selectedCardIds.includes(cardId)) {
                  onChange([...selectedCardIds, cardId]);
                }
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={selectedCardIds.length > 0 ? `${selectedCardIds.length} cards selected` : "Choose credit cards"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {activeCards.map(renderCardOption)}
              </SelectContent>
            </Select>
          </div>
          {renderSplitCardInfo()}
        </>
      )}

      {amount > 0 && (() => {
        const totalAvailable = selectedCardIds.reduce((sum, cardId) => {
          const card = creditCards.find(c => c.id === cardId);
          return sum + (card ? calculateAvailableCredit(card) : 0);
        }, 0);
        
        if (totalAvailable < amount) {
          return (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded text-sm">
              <strong>Insufficient Credit:</strong> Total available credit ({formatCurrency(totalAvailable)}) is less than the order amount ({formatCurrency(amount)}).
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};
