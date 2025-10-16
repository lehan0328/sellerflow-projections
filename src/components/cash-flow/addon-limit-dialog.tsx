import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, CreditCard, Building2, ShoppingBag, Loader2, Users } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddonLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addonType: 'bank_connection' | 'amazon_connection' | 'user';
  currentUsage: number;
  currentLimit: number;
}

const ADDON_PRICES = {
  bank_connection: 10,
  amazon_connection: 50,
  user: 15,
};

export function AddonLimitDialog({
  open,
  onOpenChange,
  addonType,
  currentUsage,
  currentLimit,
}: AddonLimitDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const unitPrice = ADDON_PRICES[addonType];
  const totalPrice = unitPrice * quantity;

  const addonInfo = {
    bank_connection: {
      title: 'Additional Financial Connections',
      description: 'Add more bank accounts and credit cards to track',
      icon: <Building2 className="h-5 w-5" />,
      label: 'Financial Connection',
    },
    amazon_connection: {
      title: 'Additional Amazon Connections',
      description: 'Connect more Amazon seller accounts',
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Amazon Connection',
    },
    user: {
      title: 'Additional Team Members',
      description: 'Add more users to your account',
      icon: <Users className="h-5 w-5" />,
      label: 'Team Member',
    },
  };

  const info = addonInfo[addonType];

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-addon', {
        body: { 
          addon_type: addonType, 
          quantity,
          return_url: window.location.pathname // Pass current page for return
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in same tab so we can handle the return
        window.location.href = data.url;
        toast.success('Redirecting to checkout...');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error purchasing addon:', error);
      toast.error('Failed to start purchase process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {info.icon}
            </div>
            <DialogTitle>{info.title}</DialogTitle>
          </div>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Usage:</span>
              <Badge variant="secondary">
                {currentUsage} / {currentLimit}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              You've reached your plan limit
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Quantity
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold">{quantity}</div>
                <div className="text-xs text-muted-foreground">
                  {info.label}{quantity > 1 ? 's' : ''}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                ${unitPrice} × {quantity} {info.label.toLowerCase()}{quantity > 1 ? 's' : ''}
              </span>
              <span className="text-2xl font-bold">
                ${totalPrice}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              One-time payment • Lifetime access
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="w-full bg-gradient-primary"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Purchase Add-ons
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}