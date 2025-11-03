import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useScenarios, type ScenarioData } from "@/hooks/useScenarios";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateRecurringDates } from "@/lib/recurringDates";
import { addDays, startOfDay, format } from "date-fns";
import { ArrowLeft, Plus, Save, Trash2, TrendingUp, TrendingDown, Calculator, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ScenarioPlanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scenarios, createScenario, updateScenario, deleteScenario, isLoading } = useScenarios();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions } = useTransactions();
  const { creditCards } = useCreditCards();
  const { accounts: bankAccounts, totalBalance: bankTotalBalance } = useBankAccounts();
  const { recurringExpenses } = useRecurringExpenses();
  const { amazonPayouts } = useAmazonPayouts();
  const { totalCash: userSettingsCash } = useUserSettings();
  
  // Balance toggle - matches Dashboard logic
  const [useAvailableBalance] = useState(() => {
    const saved = localStorage.getItem('useAvailableBalance');
    return saved !== null ? saved === 'true' : true; // Default to true (available balance)
  });

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Toggle between global and individual adjustments
  const [useIndividualAdjustments, setUseIndividualAdjustments] = useState(false);
  
  // Data source adjustments (individual)
  const [dataSourceAdjustments, setDataSourceAdjustments] = useState<Record<string, { enabled: boolean; type: 'percentage' | 'absolute'; value: number | '' }>>({});
  
  // Global adjustments by data source type with enabled state
  const [globalAdjustments, setGlobalAdjustments] = useState<Record<string, { enabled: boolean; type: 'percentage' | 'absolute'; value: number | '' }>>({
    income: { enabled: false, type: 'percentage', value: '' },
    amazonPayouts: { enabled: false, type: 'percentage', value: '' },
    purchaseOrders: { enabled: false, type: 'percentage', value: '' },
    recurringExpenses: { enabled: false, type: 'percentage', value: '' },
    creditCards: { enabled: false, type: 'percentage', value: '' },
  });
  
  // Fixed 3-month projection
  const projectionMonths = 3;

  // Calculate baseline metrics based on actual cash and build complete event list
  const allEventsData = useMemo(() => {
    // Calculate display cash matching Dashboard logic exactly
    const today = startOfDay(new Date());
    
    // Calculate available balance total
    const totalAvailableBalance = bankAccounts.reduce((sum, account) => {
      return sum + (account.available_balance ?? account.balance);
    }, 0);
    
    // Use selected balance type (matches Dashboard)
    const displayBankBalance = useAvailableBalance ? totalAvailableBalance : bankTotalBalance;
    
    // Calculate transaction total (only completed transactions on or before today)
    const transactionTotal = transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      const transactionDate = startOfDay(transaction.transactionDate);
      
      // Only count transactions on or before today and that are completed
      if (transactionDate > today || transaction.status !== 'completed') {
        return total;
      }
      
      // Income: customer_payment, sales_order
      // Expenses: purchase_order, vendor_payment
      const isIncome = transaction.type === 'customer_payment' || transaction.type === 'sales_order';
      return isIncome ? total + amount : total - amount;
    }, 0);
    
    // Use bank account balance if connected, otherwise calculate from user settings + transactions
    const currentCash = bankAccounts.length > 0 ? displayBankBalance : userSettingsCash + transactionTotal;
    
    console.log('[ScenarioPlanner] Current cash calculation:', {
      bankAccounts: bankAccounts.length,
      bankTotalBalance,
      totalAvailableBalance,
      useAvailableBalance,
      displayBankBalance,
      userSettingsCash,
      transactionTotal,
      currentCash
    });

    // Build complete event list matching dashboard logic with IDs for tracking
    const events: Array<{ date: Date; amount: number; type: 'inflow' | 'outflow'; sourceId: string; sourceType: string }> = [];

    // Add vendor transactions (purchase orders with vendors assigned)
    transactions
      .filter(tx => {
        // Only show purchase orders with vendor IDs
        if (tx.type !== 'purchase_order' || !tx.vendorId) {
          return false;
        }
        // Exclude completed transactions
        if (tx.status === 'completed') {
          return false;
        }
        // Exclude .1 transactions (paid portion of partial payments)
        if (tx.description?.endsWith('.1')) return false;
        // Exclude partially_paid parent transactions (they're replaced by .2 transactions)
        const dbStatus = (tx as any).status;
        if (dbStatus === 'partially_paid') return false;
        // Allow .2 transactions (remaining balance with new due date) to show
        return true;
      })
      .forEach(tx => {
        const eventDate = tx.dueDate || tx.transactionDate;
        events.push({
          date: eventDate,
          amount: -tx.amount,
          type: 'outflow',
          sourceId: `po_${tx.id}`,
          sourceType: 'purchase_order'
        });
      });

    // Add vendor payments (actual cash outflows that have been made)
    transactions
      .filter(t => t.type === 'vendor_payment')
      .forEach(t => {
        events.push({
          date: t.transactionDate,
          amount: -t.amount,
          type: 'outflow',
          sourceId: `vendor_payment_${t.id}`,
          sourceType: 'vendor_payment'
        });
      });

    // Add income items (exclude received)
    incomeItems
      .filter(income => income.status !== 'received')
      .forEach(income => {
        events.push({
          date: income.paymentDate,
          amount: income.amount,
          type: 'inflow',
          sourceId: `income_${income.id}`,
          sourceType: 'income'
        });
      });

    // Add credit card payments
    creditCards
      .filter(card => card.payment_due_date && card.balance > 0)
      .forEach(card => {
        const paymentAmount = card.pay_minimum 
          ? card.minimum_payment 
          : (card.statement_balance || card.balance);
        events.push({
          date: new Date(card.payment_due_date!),
          amount: -paymentAmount,
          type: 'outflow',
          sourceId: `cc_${card.id}`,
          sourceType: 'credit_card'
        });
      });

    // Add forecasted credit card payments
    creditCards
      .filter(card => card.forecast_next_month && card.payment_due_date)
      .forEach(card => {
        const projectedAmount = card.credit_limit - card.available_credit - (card.statement_balance || card.balance);
        if (projectedAmount > 0) {
          const nextDueDate = new Date(card.payment_due_date!);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          events.push({
            date: nextDueDate,
            amount: -projectedAmount,
            type: 'outflow',
            sourceId: `cc_${card.id}_forecast`,
            sourceType: 'credit_card'
          });
        }
      });

    // Add recurring expenses/income
    const rangeStart = startOfDay(new Date());
    const rangeEnd = addDays(rangeStart, 365);
    recurringExpenses.forEach(recurring => {
      const dates = generateRecurringDates(recurring, rangeStart, rangeEnd);
      dates.forEach(date => {
        events.push({
          date: date,
          amount: recurring.type === 'income' ? Number(recurring.amount) : -Number(recurring.amount),
          type: recurring.type === 'income' ? 'inflow' : 'outflow',
          sourceId: `recurring_${recurring.id}`,
          sourceType: 'recurring'
        });
      });
    });

    // Add Amazon payouts (using same filtering logic as Dashboard)
    amazonPayouts
      .filter(payout => {
        // Exclude forecasted payouts in the past - forecasts should start from today
        if ((payout.status as string) === 'forecasted') {
          const payoutDate = new Date(payout.payout_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          payoutDate.setHours(0, 0, 0, 0);
          
          if (payoutDate < today) {
            return false;
          }
        }
        
        // Exclude open settlements ONLY for daily settlement accounts
        if ((payout.status as string) === 'estimated') {
          const accountFrequency = payout.amazon_accounts?.payout_frequency;
          const rawData = (payout as any).raw_settlement_data;
          const hasEndDate = !!(rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date);
          
          if (accountFrequency === 'daily') {
            // For daily accounts, ONLY exclude open settlements (no end date)
            if (!hasEndDate) {
              return false;
            }
          }
        }
        
        return true;
      })
      .forEach(payout => {
        // Calculate display date (same logic as Dashboard)
        const isOpenSettlement = (payout.status as string) === 'estimated';
        const isForecastedPayout = (payout.status as string) === 'forecasted';
        const isConfirmedPayout = (payout.status as string) === 'confirmed';
        
        let displayDate: Date;
        
        if (isConfirmedPayout) {
          // For confirmed payouts, calculate from settlement end date + 1 day
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          
          if (settlementEndStr) {
            displayDate = new Date(settlementEndStr);
            displayDate.setDate(displayDate.getDate() + 1);
          } else {
            displayDate = new Date(payout.payout_date);
          }
        } else if (isOpenSettlement) {
          // For estimated payouts, calculate from settlement end date + 1 day
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
          
          if (settlementEndStr) {
            displayDate = new Date(settlementEndStr);
          } else if (settlementStartStr) {
            const settlementStartDate = new Date(settlementStartStr);
            const settlementCloseDate = new Date(settlementStartDate);
            settlementCloseDate.setDate(settlementCloseDate.getDate() + 14);
            displayDate = settlementCloseDate;
          } else {
            displayDate = new Date(payout.payout_date);
          }
          
          // Add +1 day for bank transfer for estimated payouts
          displayDate.setDate(displayDate.getDate() + 1);
        } else {
          // For forecasted payouts, add +1 day to payout_date for bank transfer
          displayDate = new Date(payout.payout_date);
          displayDate.setDate(displayDate.getDate() + 1);
        }
        
        events.push({
          date: displayDate,
          amount: payout.total_amount,
          type: 'inflow',
          sourceId: `amazon_${payout.id}`,
          sourceType: 'amazon_payout'
        });
      });

    // Log data sources for debugging
    console.log('[ScenarioPlanner] Data Sources:', {
      bankBalance: currentCash,
      purchaseOrders: transactions.filter(tx => tx.type === 'purchase_order' && tx.vendorId && tx.status !== 'completed').length,
      vendorPayments: transactions.filter(t => t.type === 'vendor_payment').length,
      incomeItems: incomeItems.filter(income => income.status !== 'received').length,
      creditCards: creditCards.filter(card => card.payment_due_date && card.balance > 0).length,
      recurringExpenses: recurringExpenses.length,
      amazonPayoutsTotal: amazonPayouts.length,
      amazonPayoutsFiltered: events.filter(e => e.sourceType === 'amazon_payout').length,
      totalEvents: events.length
    });
    
    // Log Amazon payouts for verification
    const amazonEvents = events.filter(e => e.sourceType === 'amazon_payout');
    console.log('[ScenarioPlanner] Amazon Payout Events:', amazonEvents.map(e => ({
      date: format(e.date, 'MMM d, yyyy'),
      amount: e.amount,
      sourceId: e.sourceId
    })));
    
    // Log top 5 largest events
    const topEvents = [...events]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5);
    console.log('[ScenarioPlanner] Top 5 Largest Events:', topEvents.map(e => ({
      amount: e.amount,
      date: format(e.date, 'MMM d, yyyy'),
      type: e.sourceType,
      sourceId: e.sourceId
    })));

    return { allEvents: events, baselineCash: currentCash };
  }, [bankAccounts, bankTotalBalance, useAvailableBalance, userSettingsCash, transactions, incomeItems, creditCards, recurringExpenses, amazonPayouts]);

  const allEvents = allEventsData.allEvents;
  const baselineCash = allEventsData.baselineCash;

  // Calculate scenario projections using actual events
  const scenarioProjection = useMemo(() => {
    const periods = [];
    const months = 3;
    
    // Start with current cash balance
    let runningBaselineCash = baselineCash;
    let runningScenarioCash = baselineCash;

    // Add current balance as starting point
    periods.push({
      month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      baselineCash: runningBaselineCash,
      scenarioCash: runningScenarioCash,
    });

    // Project forward month by month using actual events
    for (let monthOffset = 1; monthOffset <= months; monthOffset++) {
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() + monthOffset - 1);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + monthOffset);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);

      // Get events in this period
      const periodEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= periodStart && eventDate <= periodEnd;
      });

      // Calculate baseline changes
      const baselineInflows = periodEvents
        .filter(e => e.type === 'inflow')
        .reduce((sum, e) => sum + e.amount, 0);
      const baselineOutflows = periodEvents
        .filter(e => e.type === 'outflow')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

      // Calculate scenario changes with data source specific adjustments
      let scenarioInflows = 0;
      let scenarioOutflows = 0;

      // Apply adjustments per data source
      periodEvents.forEach(event => {
        const eventAmount = Math.abs(event.amount);
        let adjustedAmount = eventAmount;
        
        if (useIndividualAdjustments) {
          // Check if this specific source has an adjustment
          const adjustment = dataSourceAdjustments[event.sourceId];
          
          if (adjustment && adjustment.enabled) {
            const adjValue = typeof adjustment.value === 'number' ? adjustment.value : 0;
            if (adjustment.type === 'percentage') {
              adjustedAmount = eventAmount * (1 + adjValue / 100);
            } else {
              adjustedAmount = eventAmount + adjValue;
            }
          }
        } else {
          // Apply global adjustment based on source type
          let globalKey = '';
          if (event.sourceType === 'income') globalKey = 'income';
          else if (event.sourceType === 'amazon_payout') globalKey = 'amazonPayouts';
          else if (event.sourceType === 'purchase_order') globalKey = 'purchaseOrders';
          else if (event.sourceType === 'vendor_payment') globalKey = 'purchaseOrders'; // Vendor payments use same adjustment as purchase orders
          else if (event.sourceType === 'recurring') globalKey = 'recurringExpenses';
          else if (event.sourceType === 'credit_card') globalKey = 'creditCards';
          
          // Apply adjustment if value is set, regardless of enabled state
          if (globalKey && globalAdjustments[globalKey]) {
            const adjustment = globalAdjustments[globalKey];
            const adjValue = typeof adjustment.value === 'number' ? adjustment.value : 0;
            if (adjValue !== 0) {
              if (adjustment.type === 'percentage') {
                adjustedAmount = eventAmount * (1 + adjValue / 100);
              } else {
                adjustedAmount = eventAmount + adjValue;
              }
            }
          }
        }
        
        if (event.type === 'inflow') {
          scenarioInflows += adjustedAmount;
        } else {
          scenarioOutflows += adjustedAmount;
        }
      });

      // Update cumulative balances
      runningBaselineCash += (baselineInflows - baselineOutflows);
      runningScenarioCash += (scenarioInflows - scenarioOutflows);
      
      console.log(`[ScenarioPlanner] Month ${monthOffset}:`, {
        baselineInflows,
        baselineOutflows,
        scenarioInflows,
        scenarioOutflows,
        runningBaselineCash: Math.round(runningBaselineCash),
        runningScenarioCash: Math.round(runningScenarioCash),
        eventsInPeriod: periodEvents.length
      });

      const date = new Date();
      date.setMonth(date.getMonth() + monthOffset);
      
      periods.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baselineCash: Math.round(runningBaselineCash),
        scenarioCash: Math.round(runningScenarioCash),
      });
    }

    return periods;
  }, [allEvents, baselineCash, dataSourceAdjustments, globalAdjustments, useIndividualAdjustments]);

  // Get top transactions for debugging
  const topTransactions = useMemo(() => {
    return allEvents
      .map(event => ({
        ...event,
        absAmount: Math.abs(event.amount),
      }))
      .sort((a, b) => b.absAmount - a.absAmount)
      .slice(0, 10);
  }, [allEvents]);

  // Calculate cumulative impact based on 30-day Amazon payout data
  const cumulativeImpact = useMemo(() => {
    // Calculate 30-day average from confirmed Amazon payouts
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysPayouts = amazonPayouts
      .filter(p => 
        p.status === 'confirmed' && 
        new Date(p.payout_date) >= thirtyDaysAgo &&
        new Date(p.payout_date) <= now
      );

    // Calculate total from last 30 days
    const thirtyDayTotal = last30DaysPayouts.reduce((sum, p) => sum + p.total_amount, 0);
    
    // Project over 3 months (multiply by 3)
    const baselineNet = thirtyDayTotal * 3;
    
    // Apply scenario adjustments to Amazon payouts
    let scenarioNet = baselineNet;
    
    if (!useIndividualAdjustments && globalAdjustments.amazonPayouts) {
      const adjustment = globalAdjustments.amazonPayouts;
      const adjValue = typeof adjustment.value === 'number' ? adjustment.value : 0;
      if (adjValue !== 0) {
        if (adjustment.type === 'percentage') {
          scenarioNet = baselineNet * (1 + adjValue / 100);
        } else {
          scenarioNet = baselineNet + (adjValue * 3); // Apply absolute adjustment per month, so multiply by 3
        }
      }
    }
    
    const difference = scenarioNet - baselineNet;
    const percentChange = baselineNet !== 0 ? (difference / baselineNet) * 100 : 0;

    console.log('[ScenarioPlanner] 30-day payout calculation:', {
      last30DaysPayouts: last30DaysPayouts.length,
      thirtyDayTotal,
      baselineNet,
      scenarioNet,
      difference
    });

    return {
      baselineTotal: Math.round(baselineNet),
      scenarioTotal: Math.round(scenarioNet),
      difference: Math.round(difference),
      percentChange,
    };
  }, [amazonPayouts, globalAdjustments, useIndividualAdjustments]);

  const handleSaveScenario = () => {
    // Serialize current state into scenario data
    const adjustmentsToSave: Record<string, any> = {};
    
    if (useIndividualAdjustments) {
      // Save individual adjustments
      Object.entries(dataSourceAdjustments).forEach(([key, adj]) => {
        adjustmentsToSave[key] = {
          enabled: adj.enabled,
          adjustmentType: adj.type,
          adjustmentValue: typeof adj.value === 'number' ? adj.value : 0
        };
      });
    } else {
      // Save global adjustments
      Object.entries(globalAdjustments).forEach(([key, adj]) => {
        adjustmentsToSave[key] = {
          enabled: adj.enabled,
          adjustmentType: adj.type,
          adjustmentValue: typeof adj.value === 'number' ? adj.value : 0
        };
      });
    }
    
    const scenarioData: ScenarioData = {
      projectionMonths: 3,
      dataSourceAdjustments: adjustmentsToSave,
    };

    console.log('Saving scenario:', {
      id: selectedScenarioId,
      name: scenarioName,
      useIndividualAdjustments,
      adjustmentsToSave
    });

    if (selectedScenarioId) {
      updateScenario({
        id: selectedScenarioId,
        name: scenarioName,
        description: scenarioDescription,
        scenario_data: scenarioData,
      });
    } else {
      createScenario({
        name: scenarioName,
        description: scenarioDescription,
        scenario_data: scenarioData,
      });
    }
  };

  const handleLoadScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    console.log('Loading scenario:', scenario);

    setSelectedScenarioId(scenarioId);
    setScenarioName(scenario.name);
    setScenarioDescription(scenario.description || "");
    
    // Load saved adjustments from scenario data
    const savedAdjustments = scenario.scenario_data?.dataSourceAdjustments || {};
    
    // Check if this scenario uses global or individual adjustments
    // Global adjustment keys
    const globalKeys = ['income', 'amazonPayouts', 'purchaseOrders', 'recurringExpenses', 'creditCards'];
    const hasGlobalAdjustments = Object.keys(savedAdjustments).some(key => globalKeys.includes(key));
    const hasIndividualAdjustments = Object.keys(savedAdjustments).some(key => !globalKeys.includes(key));
    
    // Determine mode based on what adjustments exist
    if (hasGlobalAdjustments && !hasIndividualAdjustments) {
      setUseIndividualAdjustments(false);
      
      // Initialize global adjustments
      const newGlobalAdjustments: Record<string, { enabled: boolean; type: 'percentage' | 'absolute'; value: number | '' }> = {
        income: { enabled: false, type: 'percentage', value: '' },
        amazonPayouts: { enabled: false, type: 'percentage', value: '' },
        purchaseOrders: { enabled: false, type: 'percentage', value: '' },
        recurringExpenses: { enabled: false, type: 'percentage', value: '' },
        creditCards: { enabled: false, type: 'percentage', value: '' },
      };
      
      // Load global adjustments
      Object.entries(savedAdjustments).forEach(([key, adj]: [string, any]) => {
        if (globalKeys.includes(key)) {
          newGlobalAdjustments[key] = {
            enabled: adj.enabled ?? false,
            type: adj.adjustmentType || 'percentage',
            value: adj.adjustmentValue ?? ''
          };
        }
      });
      
      setGlobalAdjustments(newGlobalAdjustments);
      setDataSourceAdjustments({});
    } else {
      setUseIndividualAdjustments(true);
      
      // Load individual adjustments
      const newDataSourceAdjustments: Record<string, { enabled: boolean; type: 'percentage' | 'absolute'; value: number | '' }> = {};
      Object.entries(savedAdjustments).forEach(([key, adj]: [string, any]) => {
        newDataSourceAdjustments[key] = {
          enabled: adj.enabled ?? false,
          type: adj.adjustmentType || 'percentage',
          value: adj.adjustmentValue ?? ''
        };
      });
      
      setDataSourceAdjustments(newDataSourceAdjustments);
      setGlobalAdjustments({
        income: { enabled: false, type: 'percentage', value: '' },
        amazonPayouts: { enabled: false, type: 'percentage', value: '' },
        purchaseOrders: { enabled: false, type: 'percentage', value: '' },
        recurringExpenses: { enabled: false, type: 'percentage', value: '' },
        creditCards: { enabled: false, type: 'percentage', value: '' },
      });
    }
  };

  const handleNewScenario = () => {
    setSelectedScenarioId(null);
    setScenarioName("");
    setScenarioDescription("");
    setDataSourceAdjustments({});
    setUseIndividualAdjustments(false);
    setGlobalAdjustments({
      income: { enabled: false, type: 'percentage', value: '' },
      amazonPayouts: { enabled: false, type: 'percentage', value: '' },
      purchaseOrders: { enabled: false, type: 'percentage', value: '' },
      recurringExpenses: { enabled: false, type: 'percentage', value: '' },
      creditCards: { enabled: false, type: 'percentage', value: '' },
    });
    setIsConfigModalOpen(true);
  };

  const handleEditScenario = (scenarioId: string) => {
    handleLoadScenario(scenarioId);
    setIsConfigModalOpen(true);
  };

  const handleSaveAndClose = () => {
    handleSaveScenario();
    setIsConfigModalOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scenario Planner</h1>
          <p className="text-muted-foreground">Model "what-if" scenarios and forecast financial outcomes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewScenario} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Saved Scenarios Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Scenarios</CardTitle>
            <CardDescription>Load or manage your scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : scenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved scenarios yet</p>
            ) : (
              scenarios.map(scenario => (
                <div 
                  key={scenario.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedScenarioId === scenario.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleLoadScenario(scenario.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{scenario.name}</p>
                      {scenario.description && (
                        <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditScenario(scenario.id);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{scenario.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteScenario(scenario.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Charts and Results - Moved to main area */}
        <div className="md:col-span-2 space-y-6">
          {/* Impact Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cumulative Impact</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${cumulativeImpact.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(cumulativeImpact.difference).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cumulativeImpact.difference >= 0 ? 'Better' : 'Worse'} than baseline ({cumulativeImpact.percentChange.toFixed(1)}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Baseline Net (30-Day Payouts)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${cumulativeImpact.baselineTotal.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days × 3 months
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scenario Net (Adjusted)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${cumulativeImpact.scenarioTotal.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  With scenario adjustments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Projections */}
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comparison">Baseline vs Scenario</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Projection</TabsTrigger>
              <TabsTrigger value="expenses">Expense Projection</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Balance Projection</CardTitle>
                  <CardDescription>3-month projected cash balance: baseline vs your scenario</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={scenarioProjection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="baselineCash" 
                        stroke="#8b5cf6" 
                        strokeWidth={2} 
                        name="Baseline Balance"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="scenarioCash" 
                        stroke="#06b6d4" 
                        strokeWidth={2} 
                        name="Scenario Balance"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Impact Analysis</CardTitle>
                  <CardDescription>How your scenario affects cash position</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Starting Balance</p>
                      <p className="text-2xl font-bold">${baselineCash.toLocaleString()}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Scenario Impact (3mo)</p>
                      <p className={`text-2xl font-bold ${cumulativeImpact.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cumulativeImpact.difference >= 0 ? '+' : ''}${cumulativeImpact.difference.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Baseline End Balance</p>
                      <p className="text-2xl font-bold">${cumulativeImpact.baselineTotal.toLocaleString()}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Scenario End Balance</p>
                      <p className="text-2xl font-bold text-primary">${cumulativeImpact.scenarioTotal.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Projection includes:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Pending Income ({incomeItems.filter(i => i.status !== 'received').length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Purchase Orders ({transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Amazon Payouts ({amazonPayouts.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Recurring Items ({recurringExpenses.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Credit Card Payments ({creditCards.filter(c => c.payment_due_date).length})</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Data Sources</CardTitle>
                  <CardDescription>Active financial data included in projection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium">Pending Income</span>
                      </div>
                      <span className="text-muted-foreground">{incomeItems.filter(i => i.status !== 'received').length} items</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">Purchase Orders</span>
                      </div>
                      <span className="text-muted-foreground">{transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length} items</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-medium">Amazon Payouts</span>
                      </div>
                      <span className="text-muted-foreground">{amazonPayouts.length} payouts</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="font-medium">Recurring Transactions</span>
                      </div>
                      <span className="text-muted-foreground">{recurringExpenses.length} items</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="font-medium">Credit Card Payments</span>
                      </div>
                      <span className="text-muted-foreground">{creditCards.filter(c => c.payment_due_date).length} payments</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Active Adjustments:</p>
                    <div className="space-y-1 text-sm">
                      {useIndividualAdjustments ? (
                        Object.keys(dataSourceAdjustments).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No individual adjustments configured</p>
                        ) : (
                        Object.entries(dataSourceAdjustments).map(([key, adj]) => {
                          const numValue = typeof adj.value === 'number' ? adj.value : 0;
                          return (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-medium">
                                {adj.type === 'percentage' 
                                  ? `${numValue > 0 ? '+' : ''}${numValue}%`
                                  : `${numValue > 0 ? '+' : ''}$${Math.abs(numValue).toLocaleString()}`
                                }
                              </span>
                            </div>
                          );
                        })
                        )
                      ) : (
                        Object.entries(globalAdjustments)
                          .filter(([_, adj]) => typeof adj.value === 'number' && adj.value !== 0)
                          .length === 0 ? (
                          <p className="text-xs text-muted-foreground">No global adjustments configured</p>
                        ) : (
                          Object.entries(globalAdjustments)
                            .filter(([_, adj]) => typeof adj.value === 'number' && adj.value !== 0)
                            .map(([key, adj]) => {
                              const numValue = typeof adj.value === 'number' ? adj.value : 0;
                              return (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span className="font-medium">
                                    {adj.type === 'percentage' 
                                      ? `${numValue > 0 ? '+' : ''}${numValue}%`
                                      : `${numValue > 0 ? '+' : ''}$${Math.abs(numValue).toLocaleString()}`
                                    }
                                  </span>
                                </div>
                              );
                            })
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedScenarioId ? 'Edit Scenario' : 'New Scenario'}
            </DialogTitle>
            <DialogDescription>
              Adjust variables to model different financial outcomes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="scenario-name">Scenario Name</Label>
                <Input
                  id="scenario-name"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Aggressive Growth, Cost Reduction"
                />
              </div>

              <div>
                <Label htmlFor="scenario-description">Description (Optional)</Label>
                <Textarea
                  id="scenario-description"
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Describe this scenario..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="adjustment-mode" className="text-sm font-medium">Individual Item Adjustments</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {useIndividualAdjustments 
                      ? 'Adjust each data source item separately' 
                      : 'Apply adjustments to all items in each category'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="adjustment-mode"
                    type="checkbox"
                    checked={useIndividualAdjustments}
                    onChange={(e) => setUseIndividualAdjustments(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {!useIndividualAdjustments ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Global Data Source Adjustments</Label>
                      <p className="text-sm text-muted-foreground">Apply adjustments to entire categories</p>
                    </div>
                    <Card className="bg-muted/50 border-primary/20">
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">Live Preview Impact</div>
                        <div className={`text-lg font-bold ${cumulativeImpact.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cumulativeImpact.difference >= 0 ? '+' : ''}${Math.abs(cumulativeImpact.difference).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cumulativeImpact.difference >= 0 ? 'Improvement' : 'Decline'} vs baseline
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Income Items */}
                    {incomeItems.filter(i => i.status !== 'received').length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            All Income Items ({incomeItems.filter(i => i.status !== 'received').length})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show Details</span>
                            <Switch
                              checked={globalAdjustments.income?.enabled ?? false}
                              onCheckedChange={(checked) => setGlobalAdjustments(prev => ({
                                ...prev,
                                income: { ...prev.income, enabled: checked }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={globalAdjustments.income?.type || 'percentage'}
                            onValueChange={(v: any) => setGlobalAdjustments(prev => ({
                              ...prev,
                              income: { ...prev.income, type: v }
                            }))}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background">
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="absolute">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={globalAdjustments.income?.value ?? ''}
                            onChange={(e) => setGlobalAdjustments(prev => ({
                              ...prev,
                              income: { ...prev.income, value: e.target.value === '' ? '' : Number(e.target.value) }
                            }))}
                            placeholder="0"
                          />
                        </div>
                        {globalAdjustments.income?.enabled && (
                          <div className="pl-4 space-y-2 max-h-[200px] overflow-y-auto">
                            {incomeItems.filter(i => i.status !== 'received').map(income => (
                              <div key={income.id} className="border-t pt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground flex-1">
                                    {income.description} - ${income.amount.toLocaleString()}
                                  </div>
                                  <Switch
                                    checked={dataSourceAdjustments[`income_${income.id}`]?.enabled ?? false}
                                    onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                      ...prev,
                                      [`income_${income.id}`]: {
                                        enabled: checked,
                                        type: prev[`income_${income.id}`]?.type || 'percentage',
                                        value: prev[`income_${income.id}`]?.value || 0
                                      }
                                    }))}
                                  />
                                </div>
                                {dataSourceAdjustments[`income_${income.id}`]?.enabled && (
                                  <div className="flex gap-2">
                                    <Select
                                      value={dataSourceAdjustments[`income_${income.id}`]?.type || 'percentage'}
                                      onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`income_${income.id}`]: {
                                          enabled: prev[`income_${income.id}`]?.enabled ?? true,
                                          type: v,
                                          value: prev[`income_${income.id}`]?.value || 0
                                        }
                                      }))}
                                    >
                                      <SelectTrigger className="w-[100px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-background">
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="absolute">$</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs"
                                      value={dataSourceAdjustments[`income_${income.id}`]?.value ?? ''}
                                      onChange={(e) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`income_${income.id}`]: {
                                          enabled: prev[`income_${income.id}`]?.enabled ?? true,
                                          type: prev[`income_${income.id}`]?.type || 'percentage',
                                          value: e.target.value === '' ? '' : Number(e.target.value)
                                        }
                                      }))}
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}


                    {/* Amazon Payouts */}
                    {amazonPayouts.length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Amazon Payouts
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show Details</span>
                            <Switch
                              checked={globalAdjustments.amazonPayouts?.enabled ?? false}
                              onCheckedChange={(checked) => setGlobalAdjustments(prev => ({
                                ...prev,
                                amazonPayouts: { ...prev.amazonPayouts, enabled: checked }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {amazonPayouts.length} payout{amazonPayouts.length !== 1 ? 's' : ''} from database
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={globalAdjustments.amazonPayouts?.type || 'percentage'}
                            onValueChange={(v: any) => setGlobalAdjustments(prev => ({
                              ...prev,
                              amazonPayouts: { ...prev.amazonPayouts, type: v }
                            }))}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background">
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="absolute">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={globalAdjustments.amazonPayouts?.value ?? ''}
                            onChange={(e) => setGlobalAdjustments(prev => ({
                              ...prev,
                              amazonPayouts: { ...prev.amazonPayouts, value: e.target.value === '' ? '' : Number(e.target.value) }
                            }))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Purchase Orders */}
                    {transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            All Purchase Orders ({transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show Details</span>
                            <Switch
                              checked={globalAdjustments.purchaseOrders?.enabled ?? false}
                              onCheckedChange={(checked) => setGlobalAdjustments(prev => ({
                                ...prev,
                                purchaseOrders: { ...prev.purchaseOrders, enabled: checked }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={globalAdjustments.purchaseOrders?.type || 'percentage'}
                            onValueChange={(v: any) => setGlobalAdjustments(prev => ({
                              ...prev,
                              purchaseOrders: { ...prev.purchaseOrders, type: v }
                            }))}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background">
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="absolute">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={globalAdjustments.purchaseOrders?.value ?? ''}
                            onChange={(e) => setGlobalAdjustments(prev => ({
                              ...prev,
                              purchaseOrders: { ...prev.purchaseOrders, value: e.target.value === '' ? '' : Number(e.target.value) }
                            }))}
                            placeholder="0"
                          />
                        </div>
                        {globalAdjustments.purchaseOrders?.enabled && (
                          <div className="pl-4 space-y-2 max-h-[200px] overflow-y-auto">
                            {transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').map(tx => (
                              <div key={tx.id} className="border-t pt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground flex-1">
                                    {tx.description || 'Purchase Order'} - ${tx.amount.toLocaleString()}
                                  </div>
                                  <Switch
                                    checked={dataSourceAdjustments[`po_${tx.id}`]?.enabled ?? false}
                                    onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                      ...prev,
                                      [`po_${tx.id}`]: {
                                        enabled: checked,
                                        type: prev[`po_${tx.id}`]?.type || 'percentage',
                                        value: prev[`po_${tx.id}`]?.value || 0
                                      }
                                    }))}
                                  />
                                </div>
                                {dataSourceAdjustments[`po_${tx.id}`]?.enabled && (
                                  <div className="flex gap-2">
                                    <Select
                                      value={dataSourceAdjustments[`po_${tx.id}`]?.type || 'percentage'}
                                      onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`po_${tx.id}`]: {
                                          enabled: prev[`po_${tx.id}`]?.enabled ?? true,
                                          type: v,
                                          value: prev[`po_${tx.id}`]?.value || 0
                                        }
                                      }))}
                                    >
                                      <SelectTrigger className="w-[100px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-background">
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="absolute">$</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs"
                                      value={dataSourceAdjustments[`po_${tx.id}`]?.value ?? ''}
                                      onChange={(e) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`po_${tx.id}`]: {
                                          enabled: prev[`po_${tx.id}`]?.enabled ?? true,
                                          type: prev[`po_${tx.id}`]?.type || 'percentage',
                                          value: e.target.value === '' ? '' : Number(e.target.value)
                                        }
                                      }))}
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recurring Expenses */}
                    {recurringExpenses.length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            All Recurring Items ({recurringExpenses.length})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show Details</span>
                            <Switch
                              checked={globalAdjustments.recurringExpenses?.enabled ?? false}
                              onCheckedChange={(checked) => setGlobalAdjustments(prev => ({
                                ...prev,
                                recurringExpenses: { ...prev.recurringExpenses, enabled: checked }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={globalAdjustments.recurringExpenses?.type || 'percentage'}
                            onValueChange={(v: any) => setGlobalAdjustments(prev => ({
                              ...prev,
                              recurringExpenses: { ...prev.recurringExpenses, type: v }
                            }))}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background">
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="absolute">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={globalAdjustments.recurringExpenses?.value ?? ''}
                            onChange={(e) => setGlobalAdjustments(prev => ({
                              ...prev,
                              recurringExpenses: { ...prev.recurringExpenses, value: e.target.value === '' ? '' : Number(e.target.value) }
                            }))}
                            placeholder="0"
                          />
                        </div>
                        {globalAdjustments.recurringExpenses?.enabled && (
                          <div className="pl-4 space-y-2 max-h-[200px] overflow-y-auto">
                            {recurringExpenses.map(recurring => (
                              <div key={recurring.id} className="border-t pt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground flex-1">
                                    {recurring.name} - ${recurring.amount.toLocaleString()}
                                  </div>
                                  <Switch
                                    checked={dataSourceAdjustments[`recurring_${recurring.id}`]?.enabled ?? false}
                                    onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                      ...prev,
                                      [`recurring_${recurring.id}`]: {
                                        enabled: checked,
                                        type: prev[`recurring_${recurring.id}`]?.type || 'percentage',
                                        value: prev[`recurring_${recurring.id}`]?.value || 0
                                      }
                                    }))}
                                  />
                                </div>
                                {dataSourceAdjustments[`recurring_${recurring.id}`]?.enabled && (
                                  <div className="flex gap-2">
                                    <Select
                                      value={dataSourceAdjustments[`recurring_${recurring.id}`]?.type || 'percentage'}
                                      onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`recurring_${recurring.id}`]: {
                                          enabled: prev[`recurring_${recurring.id}`]?.enabled ?? true,
                                          type: v,
                                          value: prev[`recurring_${recurring.id}`]?.value || 0
                                        }
                                      }))}
                                    >
                                      <SelectTrigger className="w-[100px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-background">
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="absolute">$</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs"
                                      value={dataSourceAdjustments[`recurring_${recurring.id}`]?.value ?? ''}
                                      onChange={(e) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`recurring_${recurring.id}`]: {
                                          enabled: prev[`recurring_${recurring.id}`]?.enabled ?? true,
                                          type: prev[`recurring_${recurring.id}`]?.type || 'percentage',
                                          value: e.target.value === '' ? '' : Number(e.target.value)
                                        }
                                      }))}
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Credit Cards */}
                    {creditCards.filter(c => c.payment_due_date).length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            All Credit Card Payments ({creditCards.filter(c => c.payment_due_date).length})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show Details</span>
                            <Switch
                              checked={globalAdjustments.creditCards?.enabled ?? false}
                              onCheckedChange={(checked) => setGlobalAdjustments(prev => ({
                                ...prev,
                                creditCards: { ...prev.creditCards, enabled: checked }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={globalAdjustments.creditCards?.type || 'percentage'}
                            onValueChange={(v: any) => setGlobalAdjustments(prev => ({
                              ...prev,
                              creditCards: { ...prev.creditCards, type: v }
                            }))}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background">
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="absolute">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={globalAdjustments.creditCards?.value ?? ''}
                            onChange={(e) => setGlobalAdjustments(prev => ({
                              ...prev,
                              creditCards: { ...prev.creditCards, value: e.target.value === '' ? '' : Number(e.target.value) }
                            }))}
                            placeholder="0"
                          />
                        </div>
                        {globalAdjustments.creditCards?.enabled && (
                          <div className="pl-4 space-y-2 max-h-[200px] overflow-y-auto">
                            {creditCards.filter(c => c.payment_due_date).map(card => (
                              <div key={card.id} className="border-t pt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground flex-1">
                                    {card.account_name} - ${(card.statement_balance || card.balance).toLocaleString()}
                                  </div>
                                  <Switch
                                    checked={dataSourceAdjustments[`cc_${card.id}`]?.enabled ?? false}
                                    onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                      ...prev,
                                      [`cc_${card.id}`]: {
                                        enabled: checked,
                                        type: prev[`cc_${card.id}`]?.type || 'percentage',
                                        value: prev[`cc_${card.id}`]?.value || 0
                                      }
                                    }))}
                                  />
                                </div>
                                {dataSourceAdjustments[`cc_${card.id}`]?.enabled && (
                                  <div className="flex gap-2">
                                    <Select
                                      value={dataSourceAdjustments[`cc_${card.id}`]?.type || 'percentage'}
                                      onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`cc_${card.id}`]: {
                                          enabled: prev[`cc_${card.id}`]?.enabled ?? true,
                                          type: v,
                                          value: prev[`cc_${card.id}`]?.value || 0
                                        }
                                      }))}
                                    >
                                      <SelectTrigger className="w-[100px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-background">
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="absolute">$</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs"
                                      value={dataSourceAdjustments[`cc_${card.id}`]?.value ?? ''}
                                      onChange={(e) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`cc_${card.id}`]: {
                                          enabled: prev[`cc_${card.id}`]?.enabled ?? true,
                                          type: prev[`cc_${card.id}`]?.type || 'percentage',
                                          value: e.target.value === '' ? '' : Number(e.target.value)
                                        }
                                      }))}
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-base">Individual Data Source Adjustments</Label>
                  <p className="text-sm text-muted-foreground">Adjust each item separately</p>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {/* Income Items */}
                  {incomeItems.filter(i => i.status !== 'received').length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Income Items ({incomeItems.filter(i => i.status !== 'received').length})
                      </div>
                      {incomeItems.filter(i => i.status !== 'received').slice(0, 5).map(income => (
                        <div key={income.id} className="pl-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground flex-1">{income.description} - ${income.amount.toLocaleString()}</div>
                            <Switch
                              checked={dataSourceAdjustments[`income_${income.id}`]?.enabled ?? false}
                              onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                ...prev,
                                [`income_${income.id}`]: { 
                                  enabled: checked, 
                                  type: prev[`income_${income.id}`]?.type || 'percentage', 
                                  value: prev[`income_${income.id}`]?.value || 0 
                                }
                              }))}
                            />
                          </div>
                          {dataSourceAdjustments[`income_${income.id}`]?.enabled && (
                            <div className="flex gap-2">
                              <Select 
                                value={dataSourceAdjustments[`income_${income.id}`]?.type || 'percentage'}
                                onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`income_${income.id}`]: { enabled: prev[`income_${income.id}`]?.enabled ?? true, type: v, value: prev[`income_${income.id}`]?.value || 0 }
                                }))}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="absolute">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={dataSourceAdjustments[`income_${income.id}`]?.value ?? ''}
                                onChange={(e) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`income_${income.id}`]: { enabled: prev[`income_${income.id}`]?.enabled ?? true, type: prev[`income_${income.id}`]?.type || 'percentage', value: e.target.value === '' ? '' : Number(e.target.value) }
                                }))}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}


                  {/* Amazon Payouts */}
                  {amazonPayouts.length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Amazon Payouts ({amazonPayouts.length})
                      </div>
                      {amazonPayouts.slice(0, 5).map(payout => (
                        <div key={payout.id} className="pl-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground flex-1">
                              {payout.marketplace_name} - {format(new Date(payout.payout_date), 'MMM d')} - ${payout.total_amount.toLocaleString()}
                            </div>
                            <Switch
                              checked={dataSourceAdjustments[`amazon_${payout.id}`]?.enabled ?? false}
                              onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                ...prev,
                                [`amazon_${payout.id}`]: { 
                                  enabled: checked, 
                                  type: prev[`amazon_${payout.id}`]?.type || 'percentage', 
                                  value: prev[`amazon_${payout.id}`]?.value || 0 
                                }
                              }))}
                            />
                          </div>
                          {dataSourceAdjustments[`amazon_${payout.id}`]?.enabled && (
                            <div className="flex gap-2">
                              <Select 
                                value={dataSourceAdjustments[`amazon_${payout.id}`]?.type || 'percentage'}
                                onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`amazon_${payout.id}`]: { enabled: prev[`amazon_${payout.id}`]?.enabled ?? true, type: v, value: prev[`amazon_${payout.id}`]?.value || 0 }
                                }))}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="absolute">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={dataSourceAdjustments[`amazon_${payout.id}`]?.value ?? ''}
                                onChange={(e) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`amazon_${payout.id}`]: { enabled: prev[`amazon_${payout.id}`]?.enabled ?? true, type: prev[`amazon_${payout.id}`]?.type || 'percentage', value: e.target.value === '' ? '' : Number(e.target.value) }
                                }))}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Purchase Orders */}
                  {transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Purchase Orders ({transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').length})
                      </div>
                      {transactions.filter(t => t.type === 'purchase_order' && t.status !== 'completed').slice(0, 5).map(tx => (
                        <div key={tx.id} className="pl-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground flex-1">{tx.description || 'Purchase Order'} - ${tx.amount.toLocaleString()}</div>
                            <Switch
                              checked={dataSourceAdjustments[`po_${tx.id}`]?.enabled ?? false}
                              onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                ...prev,
                                [`po_${tx.id}`]: { 
                                  enabled: checked, 
                                  type: prev[`po_${tx.id}`]?.type || 'percentage', 
                                  value: prev[`po_${tx.id}`]?.value || 0 
                                }
                              }))}
                            />
                          </div>
                          {dataSourceAdjustments[`po_${tx.id}`]?.enabled && (
                            <div className="flex gap-2">
                              <Select 
                                value={dataSourceAdjustments[`po_${tx.id}`]?.type || 'percentage'}
                                onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`po_${tx.id}`]: { enabled: prev[`po_${tx.id}`]?.enabled ?? true, type: v, value: prev[`po_${tx.id}`]?.value || 0 }
                                }))}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="absolute">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={dataSourceAdjustments[`po_${tx.id}`]?.value ?? ''}
                                onChange={(e) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`po_${tx.id}`]: { enabled: prev[`po_${tx.id}`]?.enabled ?? true, type: prev[`po_${tx.id}`]?.type || 'percentage', value: e.target.value === '' ? '' : Number(e.target.value) }
                                }))}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recurring Expenses */}
                  {recurringExpenses.length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        Recurring Items ({recurringExpenses.length})
                      </div>
                      {recurringExpenses.slice(0, 5).map(recurring => (
                        <div key={recurring.id} className="pl-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground flex-1">{recurring.name} - ${recurring.amount.toLocaleString()}</div>
                            <Switch
                              checked={dataSourceAdjustments[`recurring_${recurring.id}`]?.enabled ?? false}
                              onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                ...prev,
                                [`recurring_${recurring.id}`]: { 
                                  enabled: checked, 
                                  type: prev[`recurring_${recurring.id}`]?.type || 'percentage', 
                                  value: prev[`recurring_${recurring.id}`]?.value || 0 
                                }
                              }))}
                            />
                          </div>
                          {dataSourceAdjustments[`recurring_${recurring.id}`]?.enabled && (
                            <div className="flex gap-2">
                              <Select 
                                value={dataSourceAdjustments[`recurring_${recurring.id}`]?.type || 'percentage'}
                                onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`recurring_${recurring.id}`]: { enabled: prev[`recurring_${recurring.id}`]?.enabled ?? true, type: v, value: prev[`recurring_${recurring.id}`]?.value || 0 }
                                }))}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="absolute">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={dataSourceAdjustments[`recurring_${recurring.id}`]?.value ?? ''}
                                onChange={(e) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`recurring_${recurring.id}`]: { enabled: prev[`recurring_${recurring.id}`]?.enabled ?? true, type: prev[`recurring_${recurring.id}`]?.type || 'percentage', value: e.target.value === '' ? '' : Number(e.target.value) }
                                }))}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Credit Cards */}
                  {creditCards.filter(c => c.payment_due_date).length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        Credit Card Payments ({creditCards.filter(c => c.payment_due_date).length})
                      </div>
                      {creditCards.filter(c => c.payment_due_date).slice(0, 5).map(card => (
                        <div key={card.id} className="pl-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground flex-1">{card.account_name} - ${(card.statement_balance || card.balance).toLocaleString()}</div>
                            <Switch
                              checked={dataSourceAdjustments[`cc_${card.id}`]?.enabled ?? false}
                              onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                ...prev,
                                [`cc_${card.id}`]: { 
                                  enabled: checked, 
                                  type: prev[`cc_${card.id}`]?.type || 'percentage', 
                                  value: prev[`cc_${card.id}`]?.value || 0 
                                }
                              }))}
                            />
                          </div>
                          {dataSourceAdjustments[`cc_${card.id}`]?.enabled && (
                            <div className="flex gap-2">
                              <Select 
                                value={dataSourceAdjustments[`cc_${card.id}`]?.type || 'percentage'}
                                onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`cc_${card.id}`]: { enabled: prev[`cc_${card.id}`]?.enabled ?? true, type: v, value: prev[`cc_${card.id}`]?.value || 0 }
                                }))}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="absolute">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={dataSourceAdjustments[`cc_${card.id}`]?.value ?? ''}
                                onChange={(e) => setDataSourceAdjustments(prev => ({
                                  ...prev,
                                  [`cc_${card.id}`]: { enabled: prev[`cc_${card.id}`]?.enabled ?? true, type: prev[`cc_${card.id}`]?.type || 'percentage', value: e.target.value === '' ? '' : Number(e.target.value) }
                                }))}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAndClose} disabled={!scenarioName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {selectedScenarioId ? 'Update' : 'Save'} Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
