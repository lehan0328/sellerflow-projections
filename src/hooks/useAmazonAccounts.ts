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
  payout_frequency: 'daily' | 'bi-weekly';
  transaction_count: number;
  initial_sync_complete: boolean;
  sync_status?: 'idle' | 'syncing' | 'completed' | 'error';
  sync_progress?: number;
  sync_message?: string;
  last_sync_error?: string | null;
  sync_notifications_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmazonAccountCredentials {
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  payout_frequency?: 'daily' | 'bi-weekly';
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
      console.log('[fetchAmazonAccounts] Fetching active Amazon accounts for user:', user.id);
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
          payout_frequency,
          transaction_count,
          initial_sync_complete,
          sync_status,
          sync_progress,
          sync_message,
          last_sync_error,
          sync_notifications_enabled,
          created_at,
          updated_at
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      console.log('[fetchAmazonAccounts] Query result:', { count: data?.length, error });

      if (error) {
        console.error("Error fetching Amazon accounts:", error);
        toast.error("Failed to load Amazon accounts");
        return;
      }

      setAmazonAccounts((data || []).map(account => ({
        ...account,
        payout_frequency: account.payout_frequency as 'daily' | 'bi-weekly',
        sync_status: account.sync_status as 'idle' | 'syncing' | 'completed' | 'error' | undefined
      })));
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
      // Check 3-hour rate limit for real Amazon connections (not sample data)
      if (credentials.seller_id !== 'SAMPLE123456') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_amazon_connection')
          .eq('user_id', user.id)
          .single();

        if (profile?.last_amazon_connection) {
          const lastConnection = new Date(profile.last_amazon_connection);
          const now = new Date();
          const hoursSinceLastConnection = (now.getTime() - lastConnection.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastConnection < 3) {
            const remainingMinutes = Math.ceil((3 - hoursSinceLastConnection) * 60);
            const remainingHours = Math.floor(remainingMinutes / 60);
            const remainingMins = remainingMinutes % 60;
            
            toast.error(`Please wait ${remainingHours}h ${remainingMins}m before connecting another Amazon account`);
            return false;
          }
        }
      }

      // First insert the account record directly
      const { data: accountData, error: insertError } = await supabase
        .from("amazon_accounts")
        .insert({
          user_id: user.id,
          seller_id: credentials.seller_id,
          marketplace_id: credentials.marketplace_id,
          marketplace_name: credentials.marketplace_name,
          account_name: credentials.account_name,
          payout_frequency: credentials.payout_frequency || 'bi-weekly',
          encrypted_refresh_token: credentials.refresh_token || null,
          encrypted_access_token: credentials.access_token || null,
          encrypted_client_id: credentials.client_id || null,
          encrypted_client_secret: credentials.client_secret || null
        })
        .select('id')
        .single();

      if (insertError) {
        console.error("Error adding Amazon account:", insertError);
        toast.error("Failed to add Amazon account");
        return false;
      }

      // Update last_amazon_connection timestamp for real connections
      if (credentials.seller_id !== 'SAMPLE123456') {
        await supabase
          .from('profiles')
          .update({ last_amazon_connection: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      toast.success("Amazon account added successfully!");
      await fetchAmazonAccounts();
      
      // Auto-sync the new account to populate initial data
      if (accountData?.id) {
        toast.info("Syncing Amazon data...");
        await syncAmazonAccount(accountData.id);
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

  const updatePayoutFrequency = async (accountId: string, frequency: 'daily' | 'bi-weekly'): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to update payout frequency");
      return false;
    }

    try {
      // Update both payout_frequency (for AI forecast) and payout_model (for mathematical forecast)
      const { error } = await supabase
        .from("amazon_accounts")
        .update({ 
          payout_frequency: frequency,
          payout_model: frequency // Sync both fields
        })
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating payout frequency:", error);
        toast.error("Failed to update payout frequency");
        return false;
      }

      toast.success(`Payout frequency updated to ${frequency}!`);
      await fetchAmazonAccounts();
      
      // Auto-resync to generate payouts with new frequency
      toast.info("Re-syncing with new payout schedule...");
      const syncSuccess = await syncAmazonAccount(accountId);
      
      // Only regenerate forecasts if sync was successful or if it was rate limited
      // (rate limited means there's already recent data)
      if (!syncSuccess) {
        // Check if it was a rate limit - if so, we can still regenerate forecasts with existing data
        console.log('Sync did not complete, but continuing with forecast regeneration using existing data');
      }
      
      // Automatically regenerate forecasts with the new payout frequency
      console.log('🔄 Starting forecast regeneration after payout frequency change...');
      toast.loading("Regenerating forecasts with new payout schedule...");
      
      // Delete old forecasted payouts
      const { error: deleteError } = await supabase
        .from('amazon_payouts')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'forecasted');

      if (deleteError) {
        console.error('❌ Error deleting old forecasts:', deleteError);
      } else {
        console.log('✅ Old forecasts deleted');
      }

      // Generate new forecasts
      console.log('🤖 Calling forecast-amazon-payouts function...');
      const { data: forecastData, error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts', {
        body: { userId: user.id }
      });

      console.log('📊 Forecast response:', { data: forecastData, error: forecastError });

      if (forecastError) {
        console.error('❌ Forecast regeneration error:', forecastError);
        toast.error("Payout frequency updated but forecast regeneration failed");
      } else if (forecastData?.success) {
        console.log('✅ Forecasts regenerated successfully');
        toast.success("Payout frequency updated and forecasts regenerated!");
      }
      
      return true;
    } catch (error) {
      console.error("Error updating payout frequency:", error);
      toast.error("Failed to update payout frequency");
      return false;
    }
  };

  const removeAmazonAccount = async (accountId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to remove Amazon account");
      return false;
    }

    try {
      console.log('[removeAmazonAccount] Deleting Amazon account:', accountId);
      
      // Delete all associated daily rollups
      const { error: rollupsError } = await supabase
        .from("amazon_daily_rollups")
        .delete()
        .eq("amazon_account_id", accountId);

      if (rollupsError) {
        console.error("Error deleting Amazon rollups:", rollupsError);
      }

      // Delete all associated transactions
      const { error: transactionError } = await supabase
        .from("amazon_transactions")
        .delete()
        .eq("amazon_account_id", accountId);

      if (transactionError) {
        console.error("Error deleting Amazon transactions:", transactionError);
        toast.error("Failed to delete associated transactions");
        return false;
      }

      // Delete all associated payouts
      const { error: payoutError } = await supabase
        .from("amazon_payouts")
        .delete()
        .eq("amazon_account_id", accountId);

      if (payoutError) {
        console.error("Error deleting Amazon payouts:", payoutError);
        toast.error("Failed to delete associated payouts");
        return false;
      }

      // Delete all associated daily summaries
      const { error: summaryError } = await supabase
        .from("amazon_transactions_daily_summary")
        .delete()
        .eq("amazon_account_id", accountId);

      if (summaryError) {
        console.error("Error deleting Amazon summaries:", summaryError);
      }

      // Now delete the account
      const { error } = await supabase
        .from("amazon_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing Amazon account:", error);
        toast.error("Failed to remove Amazon account");
        return false;
      }

      console.log('[removeAmazonAccount] Amazon account deleted successfully');
      toast.success("Amazon account and all associated data removed successfully!");
      
      // Force refresh the accounts list
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
      // Check if user subscription is expired
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: subData } = await supabase.functions.invoke("check-subscription", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (subData?.is_expired || subData?.trial_expired) {
          toast.error("Your account is expired. Please renew your subscription to sync data.");
          return false;
        }
      }

      // Call the edge function to sync Amazon data (background processing)
      const { data, error } = await supabase.functions.invoke("sync-amazon-data", {
        body: { 
          amazonAccountId: accountId,
          userId: user.id 
        }
      });

      if (error) {
        console.error("Error syncing Amazon account:", error);
        
        // Check if it's a rate limit error (429)
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
          const waitMatch = errorMessage.match(/wait (\d+) seconds?/i);
          const waitTime = waitMatch ? waitMatch[1] : 'a few';
          toast.warning(`Amazon API rate limit reached. Please wait ${waitTime} seconds before syncing again.`);
          return false;
        }
        
        toast.error("Failed to sync Amazon account");
        return false;
      }

      // Background sync started successfully (202 response)
      const syncResult = data as { success: boolean; status: string; message: string };
      
      if (syncResult.status === 'processing') {
        toast.info("Sync started! Data will appear automatically when ready.");
        return true;
      }
      
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

  // Subscribe to real-time updates for sync status changes
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
        },
        (payload) => {
          console.log('Amazon account updated:', payload);
          
          // If sync status changed to 'idle' with initial_sync_complete or progress 100, it completed successfully
          if (payload.eventType === 'UPDATE' && 
              payload.old.sync_status === 'syncing' && 
              payload.new.sync_status === 'idle' && 
              payload.new.sync_message?.includes('Synced')) {
            const account = payload.new as any;
            const txCount = account.transaction_count || 0;
            const message = `Sync complete! ${(txCount / 1000).toFixed(1)}K total transactions`;
            toast.success(message);
          }
          
          // If sync status changed to 'error', show error toast with details
          if (payload.eventType === 'UPDATE' && payload.new.sync_status === 'error') {
            const account = payload.new as any;
            const errorMsg = account.last_sync_error || account.sync_message || 'Unknown error';
            toast.error(`${account.account_name}: ${errorMsg}`, {
              duration: 10000, // Show for 10 seconds
            });
          }
          
          // Show info when sync starts
          if (payload.eventType === 'UPDATE' && 
              payload.old.sync_status !== 'syncing' && 
              payload.new.sync_status === 'syncing') {
            const account = payload.new as any;
            toast.info(`Syncing ${account.account_name}...`);
          }
          
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
    updatePayoutFrequency,
    removeAmazonAccount,
    syncAmazonAccount,
    refetch: fetchAmazonAccounts
  };
};