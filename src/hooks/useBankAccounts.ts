import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchAccounts = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Query the bank_accounts table directly (RLS policies ensure proper access control)
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bank accounts:", error);
        toast.error("Failed to fetch bank accounts");
        return;
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

      // Calculate pending totals per account (debits reduce available balance)
      const pendingByAccount = (pendingTransactions || []).reduce((acc, txn) => {
        if (!acc[txn.bank_account_id]) {
          acc[txn.bank_account_id] = 0;
        }
        // Negative amounts are debits (money out), positive are credits (money in)
        // Deduct debits from available balance
        acc[txn.bank_account_id] += txn.amount;
        return acc;
      }, {} as Record<string, number>);

      // Adjust available balance with pending transactions
      const adjustedAccounts = (data || []).map(account => {
        const pendingAmount = pendingByAccount[account.id] || 0;
        const baseAvailable = account.available_balance ?? account.balance;
        
        // Subtract pending debits (positive amounts in our system are debits/money out)
        const trueAvailable = baseAvailable - pendingAmount;
        
        console.log(`Account ${account.account_name}: Base available: $${baseAvailable}, Pending: $${pendingAmount}, True available: $${trueAvailable}`);
        
        return {
          ...account,
          available_balance: trueAvailable
        };
      });

      // Deduplicate accounts by plaid_account_id (keep the most recent one)
      const uniqueAccounts = adjustedAccounts.reduce((acc, account) => {
        const key = account.plaid_account_id || account.id;
        const existing = acc.get(key);
        
        // Keep the most recent account or the one with a plaid_account_id
        if (!existing || new Date(account.created_at) > new Date(existing.created_at)) {
          acc.set(key, account);
        }
        
        return acc;
      }, new Map());

      setAccounts(Array.from(uniqueAccounts.values()) as BankAccount[]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch bank accounts");
    } finally {
      setIsLoading(false);
    }
  };

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

      // Refresh accounts to show the new account
      await fetchAccounts();
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

      // Refresh accounts to show the updated data
      await fetchAccounts();
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

      setAccounts(prev => prev.filter(account => account.id !== accountId));
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

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  // Set up real-time updates - use the secure view
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
        },
        () => {
          fetchAccounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
        },
        () => {
          // Refetch accounts when transactions change to recalculate available balance
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    accounts,
    isLoading,
    totalBalance,
    addAccount,
    updateAccount,
    removeAccount,
    syncAccount,
    refetch: fetchAccounts,
  };
};