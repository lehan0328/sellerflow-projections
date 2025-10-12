import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Customer {
  id: string;
  name: string;
  paymentTerms?: string;
  netTermsDays?: number;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedCustomers = data?.map(customer => ({
        id: customer.id,
        name: customer.name,
        paymentTerms: customer.payment_terms,
        netTermsDays: customer.net_terms_days
      })) || [];

      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: customerData.name,
          payment_terms: customerData.paymentTerms,
          net_terms_days: customerData.netTermsDays
        })
        .select()
        .single();

      if (error) throw error;

      const newCustomer: Customer = {
        id: data.id,
        name: data.name,
        paymentTerms: data.payment_terms,
        netTermsDays: data.net_terms_days
      };

      setCustomers(prev => [newCustomer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
      throw error;
    }
  };

  const deleteAllCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('customers')
        .delete()
        .is('customer_id', null);

      if (error) throw error;

      setCustomers([]);
      toast.success('All customers deleted successfully');
    } catch (error) {
      console.error('Error deleting all customers:', error);
      toast.error('Failed to delete all customers');
      throw error;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    addCustomer,
    deleteAllCustomers,
    refetch: fetchCustomers
  };
};