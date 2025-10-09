import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface AmazonAccount {
  id: string;
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  last_sync: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmazonAccountCredentials {
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  refresh_token?: string;
  access_token?: string;
  client_id?: string;
  client_secret?: string;
}

export const useAmazonAccounts = () => {
  const { user } = useAuth();
  const [amazonAccounts, setAmazonAccounts] = useState<AmazonAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAmazonAccounts = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("amazon_accounts")
        .select(`
          id,
          seller_id,
          marketplace_id,
          marketplace_name,
          account_name,
          last_sync,
          is_active,
          created_at,
          updated_at
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching Amazon accounts:", error);
        toast.error("Failed to load Amazon accounts");
        return;
      }

      setAmazonAccounts(data || []);
    } catch (error) {
      console.error("Error fetching Amazon accounts:", error);
      toast.error("Failed to load Amazon accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const addAmazonAccount = async (credentials: AmazonAccountCredentials): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to add an Amazon account");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc("insert_secure_amazon_account", {
        p_seller_id: credentials.seller_id,
        p_marketplace_id: credentials.marketplace_id,
        p_marketplace_name: credentials.marketplace_name,
        p_account_name: credentials.account_name,
        p_refresh_token: credentials.refresh_token,
        p_access_token: credentials.access_token,
        p_client_id: credentials.client_id,
        p_client_secret: credentials.client_secret
      });

      if (error) {
        console.error("Error adding Amazon account:", error);
        toast.error("Failed to add Amazon account");
        return false;
      }

      toast.success("Amazon account added successfully!");
      await fetchAmazonAccounts();
      
      // Auto-sync the new account to populate initial data
      if (data) {
        toast.info("Syncing Amazon data...");
        await syncAmazonAccount(data);
      }
      
      return true;
    } catch (error) {
      console.error("Error adding Amazon account:", error);
      toast.error("Failed to add Amazon account");
      return false;
    }
  };

  const updateAmazonAccount = async (accountId: string, updates: Partial<AmazonAccountCredentials>): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to update Amazon account");
      return false;
    }

    try {
      const { error } = await supabase.rpc("update_secure_amazon_account", {
        p_account_id: accountId,
        p_account_name: updates.account_name,
        p_refresh_token: updates.refresh_token,
        p_access_token: updates.access_token,
        p_client_id: updates.client_id,
        p_client_secret: updates.client_secret
      });

      if (error) {
        console.error("Error updating Amazon account:", error);
        toast.error("Failed to update Amazon account");
        return false;
      }

      toast.success("Amazon account updated successfully!");
      await fetchAmazonAccounts();
      return true;
    } catch (error) {
      console.error("Error updating Amazon account:", error);
      toast.error("Failed to update Amazon account");
      return false;
    }
  };

  const removeAmazonAccount = async (accountId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to remove Amazon account");
      return false;
    }

    try {
      const { error } = await supabase
        .from("amazon_accounts")
        .update({ is_active: false })
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing Amazon account:", error);
        toast.error("Failed to remove Amazon account");
        return false;
      }

      toast.success("Amazon account removed successfully!");
      await fetchAmazonAccounts();
      return true;
    } catch (error) {
      console.error("Error removing Amazon account:", error);
      toast.error("Failed to remove Amazon account");
      return false;
    }
  };

  const syncAmazonAccount = async (accountId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to sync Amazon account");
      return false;
    }

    try {
      // Call the edge function to sync Amazon data
      const { data, error } = await supabase.functions.invoke("sync-amazon-data", {
        body: { amazonAccountId: accountId }
      });

      if (error) {
        console.error("Error syncing Amazon account:", error);
        toast.error("Failed to sync Amazon account");
        return false;
      }

      toast.success("Amazon account synced successfully!");
      await fetchAmazonAccounts();
      return true;
    } catch (error) {
      console.error("Error syncing Amazon account:", error);
      toast.error("Failed to sync Amazon account");
      return false;
    }
  };

  useEffect(() => {
    fetchAmazonAccounts();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("amazon_accounts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "amazon_accounts",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAmazonAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    amazonAccounts,
    isLoading,
    addAmazonAccount,
    updateAmazonAccount,
    removeAmazonAccount,
    syncAmazonAccount,
    refetch: fetchAmazonAccounts
  };
};