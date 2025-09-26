import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Vendor } from './useVendors';
import { Transaction } from './useTransactions';
import { addDays } from 'date-fns';

const DEMO_USER_ID = '514bb5ae-8645-4e4f-94bd-8701a156a8ee'; // chuandy914@gmail.com

// Fallback demo data for better demo experience
const FALLBACK_VENDORS: Vendor[] = [
  {
    id: 'demo-1',
    name: 'Acme Office Supplies',
    totalOwed: 2500,
    nextPaymentDate: addDays(new Date(), 3),
    nextPaymentAmount: 2500,
    status: 'upcoming',
    category: 'Office Supplies',
    paymentType: 'net-terms',
    netTermsDays: '30',
    poName: 'Office Equipment Q4',
    description: 'Desks, chairs, and office supplies for new team members',
    notes: 'Net 30 payment terms',
    paymentSchedule: [],
    source: 'purchase_order'
  },
  {
    id: 'demo-2',
    name: 'TechVendor Solutions',
    totalOwed: 8000,
    nextPaymentDate: addDays(new Date(), 7),
    nextPaymentAmount: 4000,
    status: 'upcoming',
    category: 'Technology',
    paymentType: 'preorder',
    poName: 'Software Licenses',
    description: 'Annual software licensing renewal',
    notes: 'Split payment: $4K now, $4K in 30 days',
    paymentSchedule: [
      { dueDate: addDays(new Date(), 7), amount: '4000' },
      { dueDate: addDays(new Date(), 37), amount: '4000' }
    ],
    source: 'purchase_order'
  },
  {
    id: 'demo-3',
    name: 'Marketing Agency Pro',
    totalOwed: 1500,
    nextPaymentDate: addDays(new Date(), 1),
    nextPaymentAmount: 1500,
    status: 'current',
    category: 'Marketing',
    paymentType: 'total',
    poName: 'Q4 Campaign',
    description: 'Social media and content marketing services',
    notes: 'Due tomorrow',
    paymentSchedule: [],
    source: 'purchase_order'
  }
];

const FALLBACK_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-t1',
    type: 'purchase_order',
    amount: 2500,
    description: 'Office Equipment Q4 - Acme Office Supplies',
    transactionDate: addDays(new Date(), -2),
    status: 'completed'
  },
  {
    id: 'demo-t2',
    type: 'sales_order',
    amount: 5000,
    description: 'Client Project Payment - ABC Corp',
    transactionDate: addDays(new Date(), -1),
    status: 'completed'
  },
  {
    id: 'demo-t3',
    type: 'purchase_order',
    amount: 8000,
    description: 'Software Licenses - TechVendor Solutions',
    transactionDate: addDays(new Date(), -3),
    status: 'completed'
  }
];

export const useDemoVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to parse dates from DB
  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const fetchDemoVendors = async () => {
    try {
      // Fetch vendors for the demo user
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching demo vendors:', error);
        setVendors(FALLBACK_VENDORS);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        // Use fallback data if no vendors exist
        setVendors(FALLBACK_VENDORS);
        setLoading(false);
        return;
      }

      const formattedVendors = data.map(vendor => ({
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
        source: vendor.source as Vendor['source'] || 'management'
      }));

      // If we have some vendors but not many, supplement with fallback data
      const allVendors = formattedVendors.length < 3 
        ? [...formattedVendors, ...FALLBACK_VENDORS.slice(formattedVendors.length)]
        : formattedVendors;

      setVendors(allVendors);
    } catch (error) {
      console.error('Error fetching demo vendors:', error);
      setVendors(FALLBACK_VENDORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoVendors();
  }, []);

  return {
    vendors,
    loading,
    refetch: fetchDemoVendors
  };
};

export const useDemoTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to parse dates from DB
  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const fetchDemoTransactions = async () => {
    try {
      // Fetch transactions for the demo user
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching demo transactions:', error);
        setTransactions(FALLBACK_TRANSACTIONS);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setTransactions(FALLBACK_TRANSACTIONS);
        setLoading(false);
        return;
      }

      const formattedTransactions = data.map(transaction => ({
        id: transaction.id,
        type: transaction.type as Transaction['type'],
        amount: Number(transaction.amount),
        description: transaction.description || '',
        vendorId: transaction.vendor_id,
        customerId: transaction.customer_id,
        transactionDate: parseDateFromDB(transaction.transaction_date),
        dueDate: transaction.due_date ? parseDateFromDB(transaction.due_date) : undefined,
        status: transaction.status as Transaction['status']
      }));

      // Supplement with fallback data if needed
      const allTransactions = formattedTransactions.length < 3
        ? [...formattedTransactions, ...FALLBACK_TRANSACTIONS.slice(formattedTransactions.length)]
        : formattedTransactions;

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching demo transactions:', error);
      setTransactions(FALLBACK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoTransactions();
  }, []);

  return {
    transactions,
    loading,
    refetch: fetchDemoTransactions
  };
};

export const useDemoUserSettings = () => {
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDemoUserSettings = async () => {
    try {
      // Fetch user settings for the demo user
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .single();

      if (error) {
        console.error('Error fetching demo user settings:', error);
        setTotalCash(25000); // Default demo cash amount
        setLoading(false);
        return;
      }

      setTotalCash(Number(data.total_cash) || 25000);
    } catch (error) {
      console.error('Error fetching demo user settings:', error);
      setTotalCash(25000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoUserSettings();
  }, []);

  return {
    totalCash,
    loading,
    refetch: fetchDemoUserSettings
  };
};