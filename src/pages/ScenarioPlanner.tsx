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

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Amazon payout forecast mode
  const [amazonForecastMode, setAmazonForecastMode] = useState<'ai' | 'average'>('average');
  
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

  // Filter Amazon payouts to only show estimated/forecasted ones for next 3 months
  const estimatedPayouts = useMemo(() => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    return amazonPayouts.filter(p => 
      (p.status === 'estimated' || p.status === 'forecasted') && 
      new Date(p.payout_date) <= threeMonthsFromNow
    );
  }, [amazonPayouts]);

  // Calculate trend-based payouts from last 2 months
  const historicalAveragePayouts = useMemo(() => {
    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Get confirmed payouts from last 2 months, sorted by date
    const recentPayouts = amazonPayouts
      .filter(p => 
        p.status === 'confirmed' && 
        new Date(p.payout_date) >= twoMonthsAgo &&
        new Date(p.payout_date) <= now
      )
      .sort((a, b) => new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime());

    if (recentPayouts.length === 0) return [];

    // Calculate growth/decline trend
    let growthRate = 0;
    if (recentPayouts.length >= 2) {
      // Calculate percentage change between consecutive payouts
      const growthRates = [];
      for (let i = 1; i < recentPayouts.length; i++) {
        const previousAmount = recentPayouts[i - 1].total_amount;
        const currentAmount = recentPayouts[i].total_amount;
        if (previousAmount > 0) {
          const change = ((currentAmount - previousAmount) / previousAmount) * 100;
          growthRates.push(change);
        }
      }
      // Average growth rate across all periods
      if (growthRates.length > 0) {
        growthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      }
    }

    // Calculate average payout frequency
    let avgDaysBetween = 14; // Default bi-weekly
    if (recentPayouts.length >= 2) {
      let totalDays = 0;
      for (let i = 1; i < recentPayouts.length; i++) {
        const diff = new Date(recentPayouts[i].payout_date).getTime() - 
                     new Date(recentPayouts[i-1].payout_date).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);
      }
      avgDaysBetween = Math.round(totalDays / (recentPayouts.length - 1));
    }

    // Start from most recent payout amount
    const lastPayoutAmount = recentPayouts[recentPayouts.length - 1].total_amount;

    // Project next 3 months applying growth trend
    const projectedPayouts = [];
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    let projectionIndex = 0;
    let currentProjectedAmount = lastPayoutAmount;
    
    while (projectionIndex < 20) { // Safety limit
      const projectedDate = new Date(now);
      projectedDate.setDate(projectedDate.getDate() + ((projectionIndex + 1) * avgDaysBetween));
      
      if (projectedDate > threeMonthsFromNow) break;
      if (projectedDate <= now) {
        projectionIndex++;
        continue;
      }
      
      // Apply growth rate to projection
      currentProjectedAmount = currentProjectedAmount * (1 + growthRate / 100);
      
      projectedPayouts.push({
        id: `avg_${projectionIndex}`,
        payout_date: projectedDate.toISOString(),
        total_amount: Math.round(currentProjectedAmount * 100) / 100, // Round to 2 decimals
        marketplace_name: `Trend-Based (${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}% growth)`,
        status: 'projected'
      });
      
      projectionIndex++;
    }

    return projectedPayouts;
  }, [amazonPayouts]);

  // Use either AI forecasted or historical average based on mode
  const displayedPayouts = amazonForecastMode === 'ai' ? estimatedPayouts : historicalAveragePayouts;

  // Calculate baseline metrics based on actual cash and build complete event list
  const allEventsData = useMemo(() => {
    // Use the total balance from the bank accounts hook
    const currentCash = bankTotalBalance;
    
    console.log('[ScenarioPlanner] Current cash from bank accounts:', currentCash);

    // Build complete event list matching dashboard logic with IDs for tracking
    const events: Array<{ date: Date; amount: number; type: 'inflow' | 'outflow'; sourceId: string; sourceType: string }> = [];

    // Add vendor transactions (purchase orders)
    transactions
      .filter(tx => tx.type === 'purchase_order' && tx.vendorId && tx.status !== 'completed')
      .forEach(tx => {
        events.push({
          date: tx.dueDate || tx.transactionDate,
          amount: -tx.amount,
          type: 'outflow',
          sourceId: `po_${tx.id}`,
          sourceType: 'purchase_order'
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

    // Add Amazon payouts (based on selected mode)
    displayedPayouts.forEach(payout => {
      events.push({
        date: new Date(payout.payout_date),
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
      incomeItems: incomeItems.filter(income => income.status !== 'received').length,
      creditCards: creditCards.filter(card => card.payment_due_date && card.balance > 0).length,
      recurringExpenses: recurringExpenses.length,
      amazonPayouts: displayedPayouts.length,
      totalEvents: events.length
    });
    
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
  }, [bankTotalBalance, transactions, incomeItems, creditCards, recurringExpenses, displayedPayouts]);

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
      amazonForecastMode: amazonForecastMode,
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
    
    // Load Amazon forecast mode (default to 'average' if not saved)
    setAmazonForecastMode(scenario.scenario_data?.amazonForecastMode || 'average');
    
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
    setAmazonForecastMode('average');
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
          {/* Data Validation Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Top 10 Largest Transactions in Projection
              </CardTitle>
              <CardDescription>
                Review the largest transactions driving your projections to identify any data errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                ) : (
                  topTransactions.map((tx, idx) => {
                    const sourceTypeLabel = 
                      tx.sourceType === 'amazon_payout' ? 'Amazon Payout' :
                      tx.sourceType === 'income' ? 'Income' :
                      tx.sourceType === 'purchase_order' ? 'Purchase Order' :
                      tx.sourceType === 'recurring' ? 'Recurring' :
                      tx.sourceType === 'credit_card' ? 'Credit Card' :
                      'Unknown';
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {sourceTypeLabel}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              tx.type === 'inflow' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {tx.type === 'inflow' ? 'Income' : 'Expense'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Date: {format(new Date(tx.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className={`text-lg font-bold ${
                          tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'inflow' ? '+' : '-'}${tx.absAmount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {topTransactions.some(tx => tx.absAmount > 100000) && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ <strong>Large amounts detected:</strong> Some transactions over $100k may be inflating projections. 
                    Review your data in the respective sections (Amazon, Income, Purchase Orders, etc.).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                    {displayedPayouts.length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Amazon Forecasted Payouts (Next 3 Months)
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
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="forecast-mode" className="text-xs">Forecast Method:</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={amazonForecastMode === 'average' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setAmazonForecastMode('average')}
                              >
                                Average
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant={amazonForecastMode === 'ai' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    AI Forecast
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Generate AI Forecast?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will analyze your Amazon sales, payouts, refunds, fees, and returns data to generate an AI-powered forecast for the next 3 months. Recent data (last 3 months) will be weighted more heavily. This may take a moment.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                      setAmazonForecastMode('ai');
                                      toast({ title: "Generating AI Forecast", description: "Analyzing your Amazon data...", duration: 10000 });
                                      try {
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) throw new Error('Not authenticated');
                                        
                                        const { error } = await supabase.functions.invoke('forecast-amazon-payouts', {
                                          body: { userId: user.id }
                                        });
                                        
                                        if (error) throw error;
                                        
                                        toast({ 
                                          title: "AI Forecast Complete! 🎉", 
                                          description: "Your Amazon payout forecast has been generated. Please refresh the page to see the updated projections.",
                                          duration: 8000
                                        });
                                      } catch (err: any) {
                                        console.error('Forecast error:', err);
                                        toast({ 
                                          title: "Forecast Failed", 
                                          description: err.message || "Unable to generate forecast",
                                          variant: "destructive"
                                        });
                                      }
                                    }}>Generate Forecast</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {displayedPayouts.length} payout{displayedPayouts.length !== 1 ? 's' : ''} • 
                          ${displayedPayouts.reduce((sum, p) => sum + p.total_amount, 0).toLocaleString()} total
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
                        {globalAdjustments.amazonPayouts?.enabled && (
                          <div className="pl-4 space-y-2 max-h-[200px] overflow-y-auto">
                            {displayedPayouts.map(payout => (
                              <div key={payout.id} className="border-t pt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground flex-1">
                                    {payout.marketplace_name} - {format(new Date(payout.payout_date), 'MMM d')} - ${payout.total_amount.toLocaleString()}
                                  </div>
                                  <Switch
                                    checked={dataSourceAdjustments[`payout_${payout.id}`]?.enabled ?? false}
                                    onCheckedChange={(checked) => setDataSourceAdjustments(prev => ({
                                      ...prev,
                                      [`payout_${payout.id}`]: {
                                        enabled: checked,
                                        type: prev[`payout_${payout.id}`]?.type || 'percentage',
                                        value: prev[`payout_${payout.id}`]?.value || 0
                                      }
                                    }))}
                                  />
                                </div>
                                {dataSourceAdjustments[`payout_${payout.id}`]?.enabled && (
                                  <div className="flex gap-2">
                                    <Select
                                      value={dataSourceAdjustments[`payout_${payout.id}`]?.type || 'percentage'}
                                      onValueChange={(v: any) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`payout_${payout.id}`]: {
                                          enabled: prev[`payout_${payout.id}`]?.enabled ?? true,
                                          type: v,
                                          value: prev[`payout_${payout.id}`]?.value || 0
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
                                      value={dataSourceAdjustments[`payout_${payout.id}`]?.value ?? ''}
                                      onChange={(e) => setDataSourceAdjustments(prev => ({
                                        ...prev,
                                        [`payout_${payout.id}`]: {
                                          enabled: prev[`payout_${payout.id}`]?.enabled ?? true,
                                          type: prev[`payout_${payout.id}`]?.type || 'percentage',
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
                  {displayedPayouts.length > 0 && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Amazon Payouts ({amazonForecastMode === 'ai' ? 'AI Forecast' : '2-Month Avg'}) ({displayedPayouts.length})
                      </div>
                      {displayedPayouts.slice(0, 5).map(payout => (
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
