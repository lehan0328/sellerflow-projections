import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface BankAccount {
  id: string;
  account_id: string;
  access_token: string;
  institution_name: string;
  account_name: string;
  account_number: string;
  account_type: "depository" | "credit" | "loan" | "investment";
  balance: number;
  available_balance?: number;
  currency_code: string;
  last_sync: string;
  is_active: boolean;
  plaid_item_id: string;
  created_at: string;
  updated_at: string;
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

      setAccounts((data || []) as BankAccount[]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch bank accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const addAccount = async (accountData: Omit<BankAccount, "id" | "created_at" | "updated_at">) => {
    if (!user) {
      toast.error("You must be logged in to add accounts");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([{
          ...accountData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding bank account:", error);
        toast.error("Failed to add bank account");
        return false;
      }

      setAccounts(prev => [data as BankAccount, ...prev]);
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
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", accountId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating bank account:", error);
        toast.error("Failed to update bank account");
        return false;
      }

      setAccounts(prev => 
        prev.map(account => 
          account.id === accountId ? { ...account, ...(data as BankAccount) } : account
        )
      );

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
        .update({ is_active: false })
        .eq("id", accountId)
        .eq("user_id", user.id);

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

  // Set up real-time updates
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
          filter: `user_id=eq.${user.id}`
        },
        () => {
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