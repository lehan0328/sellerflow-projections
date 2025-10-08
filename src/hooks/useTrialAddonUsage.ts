import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ADDON_PRODUCTS } from "./useSubscription";

interface TrialAddonUsage {
  id: string;
  user_id: string;
  addon_type: 'bank_account' | 'amazon_account' | 'user';
  quantity: number;
  created_at: string;
  updated_at: string;
}

export const useTrialAddonUsage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current trial addon usage
  const { data: trialUsage, isLoading } = useQuery({
    queryKey: ['trial-addon-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_addon_usage')
        .select('*')
        .order('addon_type');

      if (error) throw error;
      return data as TrialAddonUsage[];
    },
  });

  // Update or create trial usage
  const updateTrialUsage = useMutation({
    mutationFn: async ({ 
      addonType, 
      quantity 
    }: { 
      addonType: 'bank_account' | 'amazon_account' | 'user'; 
      quantity: number 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Try to update first
      const { data: existing } = await supabase
        .from('trial_addon_usage')
        .select('*')
        .eq('addon_type', addonType)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('trial_addon_usage')
          .update({ quantity })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('trial_addon_usage')
          .insert({
            user_id: user.id,
            addon_type: addonType,
            quantity
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-addon-usage'] });
    },
    onError: (error) => {
      console.error('Error updating trial usage:', error);
      toast({
        title: "Error",
        description: "Failed to track usage. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate total monthly cost after trial
  const calculatePostTrialCost = () => {
    if (!trialUsage) return 0;
    
    let total = 0;
    trialUsage.forEach(usage => {
      const addonProduct = ADDON_PRODUCTS[usage.addon_type];
      if (addonProduct) {
        total += addonProduct.price * usage.quantity;
      }
    });
    
    return total;
  };

  // Get usage by type
  const getUsageByType = (type: 'bank_account' | 'amazon_account' | 'user') => {
    const usage = trialUsage?.find(u => u.addon_type === type);
    return usage?.quantity || 0;
  };

  // Get formatted breakdown
  const getUsageBreakdown = () => {
    if (!trialUsage || trialUsage.length === 0) return [];
    
    return trialUsage
      .filter(usage => usage.quantity > 0)
      .map(usage => ({
        type: usage.addon_type,
        name: ADDON_PRODUCTS[usage.addon_type].name,
        quantity: usage.quantity,
        unitPrice: ADDON_PRODUCTS[usage.addon_type].price,
        totalPrice: ADDON_PRODUCTS[usage.addon_type].price * usage.quantity,
      }));
  };

  return {
    trialUsage,
    isLoading,
    updateTrialUsage: updateTrialUsage.mutate,
    calculatePostTrialCost,
    getUsageByType,
    getUsageBreakdown,
  };
};