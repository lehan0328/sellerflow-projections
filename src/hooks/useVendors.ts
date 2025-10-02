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

      console.log('Fetching vendors for user:', user.id);
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Vendors query result:', { data, error });

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

      console.log('Formatted vendors:', formattedVendors);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the vendor details before deleting
      const vendor = vendors.find(v => v.id === id);
      if (!vendor) throw new Error('Vendor not found');

      // Save to deleted_transactions before deleting
      console.log('Attempting to save deleted vendor:', {
        user_id: user.id,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        total_owed: vendor.totalOwed,
        next_payment_date: vendor.nextPaymentDate
      });

      const { error: saveError } = await supabase
        .from('deleted_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'vendor',
          original_id: vendor.id,
          name: vendor.name,
          amount: vendor.totalOwed || 0,
          description: vendor.poName || vendor.description || '',
          payment_date: vendor.nextPaymentDate ? formatDateForDB(vendor.nextPaymentDate) : null,
          status: vendor.status || 'upcoming',
          category: vendor.category || null,
          metadata: {
            paymentType: vendor.paymentType,
            netTermsDays: vendor.netTermsDays,
            paymentSchedule: vendor.paymentSchedule,
            notes: vendor.notes
          }
        });

      if (saveError) {
        console.error('Error saving deleted vendor to deleted_transactions:', saveError);
        toast({
          title: "Warning",
          description: "Vendor deleted but could not be archived: " + saveError.message,
          variant: "destructive",
        });
      } else {
        console.log('Successfully saved to deleted_transactions');
      }

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

  // Realtime subscription for vendors
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('vendors-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'vendors',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchVendors();
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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

  const deleteAllVendors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First delete all associated transactions to avoid foreign key constraint error
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .neq('vendor_id', null); // Delete all transactions that have a vendor_id

      if (transactionError) {
        console.error('Error deleting vendor transactions:', transactionError);
        // Continue with vendor deletion even if transaction deletion fails
      }

      // Then delete all vendors for this user
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setVendors([]);

      toast({
        title: "Success",
        description: "All vendors deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting all vendors:', error);
      toast({
        title: "Error",
        description: "Failed to delete all vendors",
        variant: "destructive",
      });
    }
  };

  return {
    vendors,
    loading,
    addVendor,
    updateVendor,
    deleteVendor,
    deleteAllVendors,
    refetch: fetchVendors
  };
};