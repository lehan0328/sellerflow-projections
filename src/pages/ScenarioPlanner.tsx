import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScenarios, type ScenarioData } from "@/hooks/useScenarios";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { generateRecurringDates } from "@/lib/recurringDates";
import { addDays, startOfDay } from "date-fns";
import { ArrowLeft, Plus, Save, Trash2, TrendingUp, TrendingDown, Calculator } from "lucide-react";
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

export default function ScenarioPlanner() {
  const navigate = useNavigate();
  const { scenarios, createScenario, updateScenario, deleteScenario, isLoading } = useScenarios();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions } = useTransactions();
  const { creditCards } = useCreditCards();
  const { accounts: bankAccounts } = useBankAccounts();
  const { recurringExpenses } = useRecurringExpenses();
  const { amazonPayouts } = useAmazonPayouts();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  
  // Scenario variables
  const [revenueAdjustment, setRevenueAdjustment] = useState(0);
  const [revenueAdjustmentType, setRevenueAdjustmentType] = useState<'percentage' | 'absolute'>('percentage');
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);
  const [expenseAdjustmentType, setExpenseAdjustmentType] = useState<'percentage' | 'absolute'>('percentage');
  const [creditUtilizationTarget, setCreditUtilizationTarget] = useState(30);
  
  // Fixed 3-month projection
  const projectionMonths = 3;

  // Calculate baseline metrics based on actual cash and build complete event list
  const allEventsData = useMemo(() => {
    // Get current total cash from all bank accounts (match dashboard logic)
    const currentCash = bankAccounts.reduce((sum, account) => {
      return sum + (account.balance || 0);
    }, 0);

    // Build complete event list matching dashboard logic
    const events: Array<{ date: Date; amount: number; type: 'inflow' | 'outflow' }> = [];

    // Add vendor transactions (purchase orders)
    transactions
      .filter(tx => tx.type === 'purchase_order' && tx.vendorId && tx.status !== 'completed')
      .forEach(tx => {
        events.push({
          date: tx.dueDate || tx.transactionDate,
          amount: -tx.amount,
          type: 'outflow'
        });
      });

    // Add income items (exclude received)
    incomeItems
      .filter(income => income.status !== 'received')
      .forEach(income => {
        events.push({
          date: income.paymentDate,
          amount: income.amount,
          type: 'inflow'
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
          type: 'outflow'
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
            type: 'outflow'
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
          type: recurring.type === 'income' ? 'inflow' : 'outflow'
        });
      });
    });

    // Add Amazon payouts
    amazonPayouts.forEach(payout => {
      events.push({
        date: new Date(payout.payout_date),
        amount: payout.total_amount,
        type: 'inflow'
      });
    });

    return { allEvents: events, baselineCash: currentCash };
  }, [bankAccounts, transactions, incomeItems, creditCards, recurringExpenses, amazonPayouts]);

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

      // Calculate scenario changes with adjustments
      let scenarioInflows = baselineInflows;
      let scenarioOutflows = baselineOutflows;

      if (revenueAdjustmentType === 'percentage') {
        scenarioInflows = baselineInflows * (1 + revenueAdjustment / 100);
      } else {
        scenarioInflows = baselineInflows + revenueAdjustment;
      }

      if (expenseAdjustmentType === 'percentage') {
        scenarioOutflows = baselineOutflows * (1 + expenseAdjustment / 100);
      } else {
        scenarioOutflows = baselineOutflows + expenseAdjustment;
      }

      // Update cumulative balances
      runningBaselineCash += (baselineInflows - baselineOutflows);
      runningScenarioCash += (scenarioInflows - scenarioOutflows);

      const date = new Date();
      date.setMonth(date.getMonth() + monthOffset);
      
      periods.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baselineCash: runningBaselineCash,
        scenarioCash: runningScenarioCash,
      });
    }

    return periods;
  }, [allEvents, baselineCash, revenueAdjustment, revenueAdjustmentType, expenseAdjustment, expenseAdjustmentType]);

  // Calculate cumulative impact
  const cumulativeImpact = useMemo(() => {
    if (scenarioProjection.length === 0) {
      return { baselineTotal: 0, scenarioTotal: 0, difference: 0, percentChange: 0 };
    }
    
    const baselineEnd = scenarioProjection[scenarioProjection.length - 1].baselineCash;
    const scenarioEnd = scenarioProjection[scenarioProjection.length - 1].scenarioCash;
    const baselineStart = scenarioProjection[0].baselineCash;
    const scenarioStart = scenarioProjection[0].scenarioCash;
    
    const baselineGrowth = baselineEnd - baselineStart;
    const scenarioGrowth = scenarioEnd - scenarioStart;
    const difference = scenarioEnd - baselineEnd;
    const percentChange = baselineEnd !== 0 ? (difference / baselineEnd) * 100 : 0;

    return {
      baselineTotal: baselineEnd,
      scenarioTotal: scenarioEnd,
      difference,
      percentChange,
    };
  }, [scenarioProjection]);

  const handleSaveScenario = () => {
    const scenarioData: ScenarioData = {
      revenueAdjustment,
      revenueAdjustmentType,
      expenseAdjustment,
      expenseAdjustmentType,
      creditUtilizationTarget,
      projectionMonths: 3, // Always 3 months
    };

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

    setSelectedScenarioId(scenarioId);
    setScenarioName(scenario.name);
    setScenarioDescription(scenario.description || "");
    setRevenueAdjustment(scenario.scenario_data.revenueAdjustment);
    setRevenueAdjustmentType(scenario.scenario_data.revenueAdjustmentType);
    setExpenseAdjustment(scenario.scenario_data.expenseAdjustment);
    setExpenseAdjustmentType(scenario.scenario_data.expenseAdjustmentType);
    setCreditUtilizationTarget(scenario.scenario_data.creditUtilizationTarget || 30);
  };

  const handleNewScenario = () => {
    setSelectedScenarioId(null);
    setScenarioName("");
    setScenarioDescription("");
    setRevenueAdjustment(0);
    setRevenueAdjustmentType('percentage');
    setExpenseAdjustment(0);
    setExpenseAdjustmentType('percentage');
    setCreditUtilizationTarget(30);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{scenario.name}</p>
                      {scenario.description && (
                        <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                      )}
                    </div>
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
              ))
            )}
          </CardContent>
        </Card>

        {/* Scenario Configuration */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Scenario Configuration</CardTitle>
            <CardDescription>Adjust variables to model different outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

              <div className="space-y-2">
                <Label>Revenue Adjustment</Label>
                <div className="flex gap-2">
                  <Select value={revenueAdjustmentType} onValueChange={(v: any) => setRevenueAdjustmentType(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="absolute">Dollar Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={revenueAdjustment}
                      onChange={(e) => setRevenueAdjustment(Number(e.target.value))}
                      placeholder={revenueAdjustmentType === 'percentage' ? '%' : '$'}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenueAdjustmentType === 'percentage' 
                    ? `${revenueAdjustment > 0 ? '+' : ''}${revenueAdjustment}% monthly revenue change`
                    : `${revenueAdjustment > 0 ? '+' : ''}$${Math.abs(revenueAdjustment).toLocaleString()} monthly revenue change`
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Expense Adjustment</Label>
                <div className="flex gap-2">
                  <Select value={expenseAdjustmentType} onValueChange={(v: any) => setExpenseAdjustmentType(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="absolute">Dollar Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={expenseAdjustment}
                      onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
                      placeholder={expenseAdjustmentType === 'percentage' ? '%' : '$'}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {expenseAdjustmentType === 'percentage' 
                    ? `${expenseAdjustment > 0 ? '+' : ''}${expenseAdjustment}% monthly expense change`
                    : `${expenseAdjustment > 0 ? '+' : ''}$${Math.abs(expenseAdjustment).toLocaleString()} monthly expense change`
                  }
                </p>
              </div>

              <div>
                <Label htmlFor="credit-target">Target Credit Utilization: {creditUtilizationTarget}%</Label>
                <Slider
                  id="credit-target"
                  value={[creditUtilizationTarget]}
                  onValueChange={(value) => setCreditUtilizationTarget(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleSaveScenario} className="w-full" disabled={!scenarioName}>
                <Save className="h-4 w-4 mr-2" />
                {selectedScenarioId ? 'Update Scenario' : 'Save Scenario'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <CardTitle className="text-sm font-medium">Baseline Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${cumulativeImpact.baselineTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Over {projectionMonths} months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scenario Net</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${cumulativeImpact.scenarioTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Over {projectionMonths} months
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
                <p className="text-sm font-medium mb-2">Adjustment Settings:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Adjustment:</span>
                    <span className="font-medium">
                      {revenueAdjustmentType === 'percentage' 
                        ? `${revenueAdjustment > 0 ? '+' : ''}${revenueAdjustment}%`
                        : `${revenueAdjustment > 0 ? '+' : ''}$${Math.abs(revenueAdjustment).toLocaleString()}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expense Adjustment:</span>
                    <span className="font-medium">
                      {expenseAdjustmentType === 'percentage'
                        ? `${expenseAdjustment > 0 ? '+' : ''}${expenseAdjustment}%`
                        : `${expenseAdjustment > 0 ? '+' : ''}$${Math.abs(expenseAdjustment).toLocaleString()}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}