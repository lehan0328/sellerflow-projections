import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'upcoming' | 'current' | 'overdue' | 'paid';
  category: string;
  paymentType?: 'total' | 'preorder' | 'net-terms';
  netTermsDays?: string;
  poName?: string;
  description?: string;
  notes?: string;
  paymentSchedule?: any[];
  source?: 'purchase_order' | 'management';
  created_at?: string;
  updated_at?: string;
}

export const useVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Helper function to format date for database without timezone issues
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse 'YYYY-MM-DD' into a local Date (avoids timezone shift)
  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const fetchVendors = async () => {
    try {
      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found, skipping vendor fetch');
        setVendors([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching vendors:', error);
        throw error;
      }

      const formattedVendors = data?.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        totalOwed: Number(vendor.total_owed),
        nextPaymentDate: vendor.next_payment_date ? parseDateFromDB(vendor.next_payment_date) : new Date(),
        nextPaymentAmount: Number(vendor.next_payment_amount),
        status: vendor.status as Vendor['status'],
        category: vendor.category || '',
        paymentType: vendor.payment_type as Vendor['paymentType'],
        netTermsDays: vendor.net_terms_days?.toString(),
        poName: vendor.po_name || '',
        description: vendor.description || '',
        notes: vendor.notes || '',
        paymentSchedule: Array.isArray(vendor.payment_schedule) ? vendor.payment_schedule : [],
        source: vendor.source as Vendor['source'] || 'management',
        created_at: vendor.created_at,
        updated_at: vendor.updated_at
      })) || [];

      setVendors(formattedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addVendor = async (vendorData: Omit<Vendor, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          name: vendorData.name,
          total_owed: vendorData.totalOwed,
          next_payment_date: formatDateForDB(vendorData.nextPaymentDate),
          next_payment_amount: vendorData.nextPaymentAmount,
          status: vendorData.status,
          category: vendorData.category,
          payment_type: vendorData.paymentType,
          net_terms_days: vendorData.netTermsDays ? parseInt(vendorData.netTermsDays) : null,
          po_name: vendorData.poName || null,
          description: vendorData.description || null,
          notes: vendorData.notes || null,
          payment_schedule: vendorData.paymentSchedule || null,
          source: vendorData.source || 'management'
        })
        .select()
        .single();

      if (error) throw error;

      const newVendor: Vendor = {
        id: data.id,
        name: data.name,
        totalOwed: Number(data.total_owed),
        nextPaymentDate: parseDateFromDB(data.next_payment_date),
        nextPaymentAmount: Number(data.next_payment_amount),
        status: data.status as Vendor['status'],
        category: data.category || '',
        paymentType: data.payment_type as Vendor['paymentType'],
        netTermsDays: data.net_terms_days?.toString(),
        poName: data.po_name || '',
        description: data.description || '',
        notes: data.notes || '',
        paymentSchedule: Array.isArray(data.payment_schedule) ? data.payment_schedule : [],
        source: data.source as Vendor['source'] || 'management'
      };

      setVendors(prev => [newVendor, ...prev]);
      
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });

      return newVendor;
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast({
        title: "Error",
        description: "Failed to add vendor",
        variant: "destructive",
      });
    }
  };

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.totalOwed !== undefined) dbUpdates.total_owed = updates.totalOwed;
      if (updates.nextPaymentDate) dbUpdates.next_payment_date = formatDateForDB(updates.nextPaymentDate);
      if (updates.nextPaymentAmount !== undefined) dbUpdates.next_payment_amount = updates.nextPaymentAmount;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.category) dbUpdates.category = updates.category;
      if (updates.paymentType) dbUpdates.payment_type = updates.paymentType;
      if (updates.netTermsDays) dbUpdates.net_terms_days = parseInt(updates.netTermsDays);
      if (updates.poName !== undefined) dbUpdates.po_name = updates.poName;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.paymentSchedule !== undefined) dbUpdates.payment_schedule = updates.paymentSchedule;

      const { error } = await supabase
        .from('vendors')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setVendors(prev => prev.map(vendor => 
        vendor.id === id ? { ...vendor, ...updates } : vendor
      ));

      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      // First delete all associated transactions to avoid foreign key constraint error
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('vendor_id', id);

      if (transactionError) {
        console.error('Error deleting vendor transactions:', transactionError);
        // Continue with vendor deletion even if transaction deletion fails
      }

      // Then delete the vendor
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVendors(prev => prev.filter(vendor => vendor.id !== id));

      toast({
        title: "Success",
        description: "Vendor transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor transaction",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Also fetch vendors when auth state potentially changes
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && vendors.length === 0) {
        fetchVendors();
      }
    };
    
    checkAuthAndFetch();
  }, [vendors.length]);

  return {
    vendors,
    loading,
    addVendor,
    updateVendor,
    deleteVendor,
    refetch: fetchVendors
  };
};