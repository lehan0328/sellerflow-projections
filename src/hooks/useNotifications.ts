import { useState, useEffect, useMemo } from 'react';
import { useIncome } from './useIncome';
import { useVendors } from './useVendors';
import { useCreditCards } from './useCreditCards';
import { useRecurringExpenses } from './useRecurringExpenses';
import { useBankAccounts } from './useBankAccounts';
import { useAmazonPayouts } from './useAmazonPayouts';
import { addDays, isBefore, startOfDay, differenceInDays, format } from 'date-fns';

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'critical';
  category: 'payment' | 'income' | 'cash-flow' | 'amazon' | 'bank' | 'credit';
  title: string;
  message: string;
  amount?: number;
  date: Date;
  dueDate?: Date;
  actionable: boolean;
  actionLabel?: string;
  actionData?: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export const useNotifications = () => {
  const { incomeItems } = useIncome();
  const { vendors } = useVendors();
  const { creditCards } = useCreditCards();
  const { recurringExpenses } = useRecurringExpenses();
  const { totalBalance } = useBankAccounts();
  const { amazonPayouts } = useAmazonPayouts();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Generate automated notifications based on financial data
  const generatedNotifications = useMemo(() => {
    const today = startOfDay(new Date());
    const notifs: Notification[] = [];

    // 1. Overdue Income Notifications
    incomeItems
      .filter(income => income.status === 'pending')
      .forEach(income => {
        const paymentDate = startOfDay(new Date(income.paymentDate));
        const daysOverdue = differenceInDays(today, paymentDate);
        
        if (daysOverdue > 0) {
          notifs.push({
            id: `overdue-income-${income.id}`,
            type: 'critical',
            category: 'income',
            title: 'Overdue Payment',
            message: `${income.customer || 'Unknown customer'} payment is ${daysOverdue} days overdue`,
            amount: income.amount,
            date: new Date(),
            dueDate: paymentDate,
            actionable: true,
            actionLabel: 'View Details',
            actionData: { incomeId: income.id },
            read: readNotifications.has(`overdue-income-${income.id}`),
            priority: 'high'
          });
        } else if (daysOverdue === 0) {
          notifs.push({
            id: `due-today-income-${income.id}`,
            type: 'warning',
            category: 'income',
            title: 'Payment Due Today',
            message: `${income.customer || 'Unknown customer'} payment is due today`,
            amount: income.amount,
            date: new Date(),
            dueDate: paymentDate,
            actionable: true,
            actionLabel: 'Mark as Received',
            actionData: { incomeId: income.id },
            read: readNotifications.has(`due-today-income-${income.id}`),
            priority: 'high'
          });
        }
      });

    // 2. Upcoming Income (3 days)
    incomeItems
      .filter(income => income.status === 'pending')
      .forEach(income => {
        const paymentDate = startOfDay(new Date(income.paymentDate));
        const daysUntil = differenceInDays(paymentDate, today);
        
        if (daysUntil > 0 && daysUntil <= 3) {
          notifs.push({
            id: `upcoming-income-${income.id}`,
            type: 'info',
            category: 'income',
            title: 'Upcoming Payment',
            message: `Expecting ${income.customer || 'payment'} in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
            amount: income.amount,
            date: new Date(),
            dueDate: paymentDate,
            actionable: false,
            read: readNotifications.has(`upcoming-income-${income.id}`),
            priority: 'low'
          });
        }
      });

    // 3. Credit Card Payment Due
    creditCards
      .filter(card => card.payment_due_date)
      .forEach(card => {
        const dueDate = startOfDay(new Date(card.payment_due_date!));
        const daysUntil = differenceInDays(dueDate, today);
        const amount = card.statement_balance || card.balance;
        
        if (daysUntil <= 7 && daysUntil >= 0) {
          notifs.push({
            id: `cc-due-${card.id}`,
            type: daysUntil <= 2 ? 'critical' : 'warning',
            category: 'credit',
            title: 'Credit Card Payment Due',
            message: `${card.account_name} payment due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}`,
            amount: amount,
            date: new Date(),
            dueDate: dueDate,
            actionable: true,
            actionLabel: 'Pay Now',
            actionData: { cardId: card.id },
            read: readNotifications.has(`cc-due-${card.id}`),
            priority: daysUntil <= 2 ? 'high' : 'medium'
          });
        }
      });

    // 4. Low Cash Balance Warning
    if (totalBalance < 10000) {
      notifs.push({
        id: 'low-cash-balance',
        type: 'warning',
        category: 'cash-flow',
        title: 'Low Cash Balance',
        message: `Your total cash balance is below $10,000`,
        amount: totalBalance,
        date: new Date(),
        actionable: true,
        actionLabel: 'Review Cash Flow',
        read: readNotifications.has('low-cash-balance'),
        priority: 'high'
      });
    }

    // 5. High Credit Utilization
    creditCards.forEach(card => {
      const utilization = ((card.balance / card.credit_limit) * 100);
      if (utilization > 80) {
        notifs.push({
          id: `high-utilization-${card.id}`,
          type: 'warning',
          category: 'credit',
          title: 'High Credit Utilization',
          message: `${card.account_name} is at ${utilization.toFixed(0)}% utilization`,
          amount: card.balance,
          date: new Date(),
          actionable: true,
          actionLabel: 'View Card',
          actionData: { cardId: card.id },
          read: readNotifications.has(`high-utilization-${card.id}`),
          priority: 'medium'
        });
      }
    });

    // 6. Upcoming Amazon Payouts
    amazonPayouts
      .filter(payout => payout.status === 'confirmed' || payout.status === 'estimated')
      .forEach(payout => {
        const payoutDate = startOfDay(new Date(payout.payout_date));
        const daysUntil = differenceInDays(payoutDate, today);
        
        if (daysUntil >= 0 && daysUntil <= 5) {
          notifs.push({
            id: `amazon-payout-${payout.id}`,
            type: 'success',
            category: 'amazon',
            title: 'Amazon Payout Coming',
            message: `${payout.marketplace_name} payout expected ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}`,
            amount: payout.total_amount,
            date: new Date(),
            dueDate: payoutDate,
            actionable: false,
            read: readNotifications.has(`amazon-payout-${payout.id}`),
            priority: 'low'
          });
        }
      });

    // 7. Recurring Expense Upcoming
    recurringExpenses
      .filter(expense => expense.is_active && expense.type === 'expense')
      .forEach(expense => {
        const nextDate = startOfDay(new Date(expense.start_date));
        const daysUntil = differenceInDays(nextDate, today);
        
        if (daysUntil >= 0 && daysUntil <= 3) {
          notifs.push({
            id: `recurring-${expense.id}`,
            type: 'info',
            category: 'payment',
            title: 'Recurring Payment Coming',
            message: `${expense.name} charge ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}`,
            amount: expense.amount,
            date: new Date(),
            dueDate: nextDate,
            actionable: false,
            read: readNotifications.has(`recurring-${expense.id}`),
            priority: 'low'
          });
        }
      });

    // Sort by priority and date
    return notifs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.date.getTime() - a.date.getTime();
    });
  }, [incomeItems, vendors, creditCards, recurringExpenses, totalBalance, amazonPayouts, readNotifications]);

  useEffect(() => {
    setNotifications(generatedNotifications);
  }, [generatedNotifications]);

  const markAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  };
};
