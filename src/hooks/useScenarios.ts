import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DataSourceAdjustment {
  enabled: boolean;
  adjustmentType: 'percentage' | 'absolute';
  adjustmentValue: number;
}

export interface ScenarioData {
  // Projection settings
  projectionMonths: number;
  
  // Data source specific adjustments
  dataSourceAdjustments?: {
    // Income sources
    income?: Record<string, DataSourceAdjustment>;
    
    // Amazon payouts
    amazonPayouts?: Record<string, DataSourceAdjustment>;
    
    // Recurring income
    recurringIncome?: Record<string, DataSourceAdjustment>;
    
    // Purchase orders
    purchaseOrders?: Record<string, DataSourceAdjustment>;
    
    // Recurring expenses
    recurringExpenses?: Record<string, DataSourceAdjustment>;
    
    // Credit card payments
    creditCards?: Record<string, DataSourceAdjustment>;
  };
  
  // Global fallback adjustments (if no specific source is configured)
  globalRevenueAdjustment?: number;
  globalRevenueAdjustmentType?: 'percentage' | 'absolute';
  globalExpenseAdjustment?: number;
  globalExpenseAdjustmentType?: 'percentage' | 'absolute';
}

export interface Scenario {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  scenario_data: ScenarioData;
  created_at: string;
  updated_at: string;
}

export const useScenarios = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenarios")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data.map(item => ({
        ...item,
        scenario_data: item.scenario_data as unknown as ScenarioData
      })) as Scenario[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (scenario: {
      name: string;
      description?: string;
      scenario_data: ScenarioData;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scenarios")
        .insert({
          user_id: userData.user.id,
          name: scenario.name,
          description: scenario.description,
          scenario_data: scenario.scenario_data as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      toast({
        title: "Scenario created",
        description: "Your scenario has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create scenario: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateScenario = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      scenario_data?: ScenarioData;
    }) => {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.scenario_data) updateData.scenario_data = updates.scenario_data;

      const { data, error } = await supabase
        .from("scenarios")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      toast({
        title: "Scenario updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update scenario: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      toast({
        title: "Scenario deleted",
        description: "The scenario has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete scenario: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    scenarios,
    isLoading,
    createScenario: createScenario.mutate,
    updateScenario: updateScenario.mutate,
    deleteScenario: deleteScenario.mutate,
    isCreating: createScenario.isPending,
    isUpdating: updateScenario.isPending,
    isDeleting: deleteScenario.isPending,
  };
};