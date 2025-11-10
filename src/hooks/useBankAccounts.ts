import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface BankAccount {
  id: string;
  access_token?: string;
  institution_name: string;
  account_name: string;
  account_number?: string;
  account_type: "depository" | "credit" | "loan" | "investment";
  balance: number;
  available_balance?: number;
  currency_code: string;
  last_sync: string;
  is_active: boolean;
  plaid_item_id?: string;
  plaid_account_id?: string; // Stripe Financial Connections or Plaid account ID
  masked_account_number?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export const useBankAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const fetchAccounts = async (): Promise<BankAccount[]> => {
    if (!user) return [];

    // Query the bank_accounts table directly (RLS policies ensure proper access control)
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Failed to fetch bank accounts");
      return [];
    }

    // Fetch pending transactions to calculate true available balance
    const { data: pendingTransactions, error: pendingError } = await supabase
      .from("bank_transactions")
      .select("bank_account_id, amount")
      .eq("pending", true)
      .eq("archived", false);

    if (pendingError) {
      console.error("Error fetching pending transactions:", pendingError);
    }

    // Calculate pending totals per account
    const pendingByAccount = (pendingTransactions || []).reduce((acc, txn) => {
      if (!acc[txn.bank_account_id]) {
        acc[txn.bank_account_id] = 0;
      }
      acc[txn.bank_account_id] += Math.abs(txn.amount);
      return acc;
    }, {} as Record<string, number>);

    // Use Plaid's balances directly - they already account for pending transactions
    const adjustedAccounts = (data || []).map(account => {
      const pendingAmount = pendingByAccount[account.id] || 0;
      const trueAvailable = account.available_balance ?? account.balance;
      
      console.log(`Account ${account.account_name}: Balance: $${account.balance}, Available: $${trueAvailable}, Pending noted: $${pendingAmount}`);
      
      return {
        ...account,
        available_balance: trueAvailable
      };
    });

    // Deduplicate accounts by plaid_account_id (keep the most recent one)
    const uniqueAccounts = adjustedAccounts.reduce((acc, account) => {
      const key = account.plaid_account_id || account.id;
      const existing = acc.get(key);
      
      if (!existing || new Date(account.created_at) > new Date(existing.created_at)) {
        acc.set(key, account);
      }
      
      return acc;
    }, new Map());

    return Array.from(uniqueAccounts.values()) as BankAccount[];
  };

  // Use React Query with 60-minute staleTime (bank accounts rarely change)
  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['bank-accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });

  const addAccount = async (accountData: Omit<BankAccount, "id" | "created_at" | "updated_at" | "user_id" | "masked_account_number">) => {
    if (!user) {
      toast.error("You must be logged in to add accounts");
      return false;
    }

    try {
      // Check for duplicate plaid_account_id
      if (accountData.plaid_item_id) {
        const { data: existingAccounts, error: checkError } = await supabase
          .from("bank_accounts")
          .select("id, account_name, institution_name, plaid_account_id")
          .eq("is_active", true);

        if (checkError) {
          console.error("Error checking for duplicate accounts:", checkError);
        } else if (existingAccounts && existingAccounts.length > 0) {
          // Check if any existing account has the same plaid_item_id
          const duplicate = existingAccounts.find(acc => 
            acc.plaid_account_id && acc.plaid_account_id === accountData.plaid_item_id
          );
          if (duplicate) {
            toast.error(`This bank account is already connected: ${duplicate.institution_name} - ${duplicate.account_name}`);
            return false;
          }
        }
      }

      // Use the secure insert function instead of direct insert
      const { data, error } = await supabase.rpc('insert_secure_bank_account', {
        p_institution_name: accountData.institution_name,
        p_account_name: accountData.account_name,
        p_account_type: accountData.account_type,
        p_balance: accountData.balance,
        p_available_balance: accountData.available_balance,
        p_currency_code: accountData.currency_code || 'USD',
        p_access_token: accountData.access_token,
        p_account_number: accountData.account_number,
        p_plaid_item_id: accountData.plaid_item_id
      });

      if (error) {
        console.error("Error adding bank account:", error);
        toast.error("Failed to add bank account");
        return false;
      }

      // Invalidate query to refresh accounts
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts', user.id] });
      toast.success("Bank account added successfully!");
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add bank account");
      return false;
    }
  };

  const updateAccount = async (accountId: string, updates: Partial<BankAccount>) => {
    if (!user) {
      toast.error("You must be logged in to update accounts");
      return false;
    }

    try {
      // Use the secure update function instead of direct update
      const { data, error } = await supabase.rpc('update_secure_bank_account', {
        p_account_id: accountId,
        p_institution_name: updates.institution_name,
        p_account_name: updates.account_name,
        p_account_type: updates.account_type,
        p_balance: updates.balance,
        p_available_balance: updates.available_balance,
        p_currency_code: updates.currency_code,
        p_access_token: updates.access_token,
        p_account_number: updates.account_number,
        p_plaid_item_id: updates.plaid_item_id
      });

      if (error) {
        console.error("Error updating bank account:", error);
        toast.error("Failed to update bank account");
        return false;
      }

      // Invalidate query to refresh accounts
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts', user.id] });
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update bank account");
      return false;
    }
  };

  const removeAccount = async (accountId: string) => {
    if (!user) {
      toast.error("You must be logged in to remove accounts");
      return false;
    }

    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", accountId);

      if (error) {
        console.error("Error removing bank account:", error);
        toast.error("Failed to remove bank account");
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: ['bank-accounts', user.id] });
      toast.success("Bank account removed successfully!");
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to remove bank account");
      return false;
    }
  };

  const syncAccount = async (accountId: string) => {
    return await updateAccount(accountId, { 
      last_sync: new Date().toISOString()
    });
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  // Set up debounced real-time updates
  useEffect(() => {
    if (!user) return;

    const debouncedRefetch = () => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Wait 2 seconds before refetching to batch multiple changes
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['bank-accounts', user.id],
          exact: true 
        });
      }, 2000);
    };

    const channel = supabase
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
        },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    accounts,
    isLoading,
    totalBalance,
    addAccount,
    updateAccount,
    removeAccount,
    syncAccount,
    refetch,
  };
};