import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Customer {
  id: string;
  name: string;
  paymentTerms?: string;
  netTermsDays?: number;
  category?: string;
}

export const useCustomers = () => {
  const queryClient = useQueryClient();

  const fetchCustomers = async (): Promise<Customer[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
      return [];
    }

    return data?.map(customer => ({
      id: customer.id,
      name: customer.name,
      paymentTerms: customer.payment_terms,
      netTermsDays: customer.net_terms_days,
      category: customer.category
    })) || [];
  };

  // Use React Query with 30-minute staleTime (customers rarely change)
  const { data: customers = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

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
          net_terms_days: customerData.netTermsDays,
          category: customerData.category
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this name already exists');
        }
        throw error;
      }

      const newCustomer: Customer = {
        id: data.id,
        name: data.name,
        paymentTerms: data.payment_terms,
        netTermsDays: data.net_terms_days,
        category: data.category
      };

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
      throw error;
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
      throw error;
    }
  };

  const updateCustomer = async (customerId: string, customerData: Omit<Customer, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: customerData.name,
          payment_terms: customerData.paymentTerms,
          net_terms_days: customerData.netTermsDays,
          category: customerData.category
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this name already exists');
        }
        throw error;
      }

      const updatedCustomer: Customer = {
        id: data.id,
        name: data.name,
        paymentTerms: data.payment_terms,
        netTermsDays: data.net_terms_days,
        category: data.category
      };

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
      throw error;
    }
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refetch
  };
};