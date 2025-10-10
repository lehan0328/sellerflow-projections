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
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
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
  const { transactions } = useBankTransactions();
  const { creditCards } = useCreditCards();
  const { accounts: bankAccounts } = useBankAccounts();

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

  // Calculate baseline metrics based on actual cash and historical data
  const baselineMetrics = useMemo(() => {
    // Get current total cash from all bank accounts
    const currentCash = bankAccounts.reduce((sum, account) => {
      return sum + (account.available_balance || account.balance || 0);
    }, 0);
    
    // Get received income from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentIncome = incomeItems.filter(i => {
      if (i.status !== 'received') return false;
      const paymentDate = new Date(i.paymentDate);
      return paymentDate >= sixMonthsAgo;
    });
    
    const totalRevenue = recentIncome.reduce((sum, i) => sum + i.amount, 0);
    
    // Calculate actual monthly average from historical data
    const monthlyRevenue = recentIncome.length > 0 ? totalRevenue / 6 : 0;
    
    // For expenses, use the total owed divided by 6 as an estimate
    const totalExpenses = vendors.reduce((sum, v) => sum + (v.totalOwed || 0), 0);
    const monthlyExpenses = totalExpenses > 0 ? totalExpenses / 6 : 0;
    
    return {
      currentCash,
      totalRevenue,
      totalExpenses,
      monthlyRevenue,
      monthlyExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }, [incomeItems, vendors, bankAccounts]);

  // Calculate scenario projections with daily granularity for 3-month projection
  const scenarioProjection = useMemo(() => {
    const periods = [];
    const { currentCash, monthlyRevenue: baseMonthlyRevenue, monthlyExpenses: baseMonthlyExpenses } = baselineMetrics;
    
    // Always use 3 months, show monthly data points
    const months = 3;
    
    // Convert to daily rates for smooth projection
    const baseDailyRevenue = baseMonthlyRevenue / 30;
    const baseDailyExpenses = baseMonthlyExpenses / 30;

    // Start with current cash balance
    let baselineCash = currentCash;
    let scenarioCash = currentCash;

    // Handle case where there's no baseline data
    if (baseMonthlyRevenue === 0 && baseMonthlyExpenses === 0) {
      for (let i = 0; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        
        periods.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          baselineCash: currentCash,
          scenarioCash: currentCash,
        });
      }
      return periods;
    }

    // Add current balance as starting point
    periods.push({
      month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      baselineCash: currentCash,
      scenarioCash: currentCash,
    });

    // Project forward month by month
    for (let i = 1; i <= months; i++) {
      const daysInPeriod = 30; // Approximate 30 days per month
      
      // Calculate adjustments
      let adjustedDailyRevenue = baseDailyRevenue;
      let adjustedDailyExpenses = baseDailyExpenses;

      if (revenueAdjustmentType === 'percentage') {
        adjustedDailyRevenue = baseDailyRevenue * (1 + revenueAdjustment / 100);
      } else {
        adjustedDailyRevenue = baseDailyRevenue + (revenueAdjustment / 30);
      }

      if (expenseAdjustmentType === 'percentage') {
        adjustedDailyExpenses = baseDailyExpenses * (1 + expenseAdjustment / 100);
      } else {
        adjustedDailyExpenses = baseDailyExpenses + (expenseAdjustment / 30);
      }

      // Calculate month's net change
      const baselineMonthlyNet = (baseDailyRevenue - baseDailyExpenses) * daysInPeriod;
      const scenarioMonthlyNet = (adjustedDailyRevenue - adjustedDailyExpenses) * daysInPeriod;

      // Update cumulative balances
      baselineCash += baselineMonthlyNet;
      scenarioCash += scenarioMonthlyNet;

      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      periods.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baselineCash: baselineCash,
        scenarioCash: scenarioCash,
      });
    }

    return periods;
  }, [baselineMetrics, revenueAdjustment, revenueAdjustmentType, expenseAdjustment, expenseAdjustmentType]);

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
                  <p className="text-2xl font-bold">${baselineMetrics.currentCash.toLocaleString()}</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Assumptions</CardTitle>
              <CardDescription>Base metrics used for projections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Baseline Monthly Revenue</p>
                  <p className="text-xl font-semibold text-green-600">${baselineMetrics.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Scenario Monthly Revenue</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${(revenueAdjustmentType === 'percentage' 
                      ? baselineMetrics.monthlyRevenue * (1 + revenueAdjustment / 100)
                      : baselineMetrics.monthlyRevenue + revenueAdjustment
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Baseline Monthly Expenses</p>
                  <p className="text-xl font-semibold text-red-600">${baselineMetrics.monthlyExpenses.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Scenario Monthly Expenses</p>
                  <p className="text-xl font-semibold text-red-600">
                    ${(expenseAdjustmentType === 'percentage'
                      ? baselineMetrics.monthlyExpenses * (1 + expenseAdjustment / 100)
                      : baselineMetrics.monthlyExpenses + expenseAdjustment
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}