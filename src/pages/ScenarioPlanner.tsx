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

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  
  // Scenario variables
  const [revenueAdjustment, setRevenueAdjustment] = useState(0);
  const [revenueAdjustmentType, setRevenueAdjustmentType] = useState<'percentage' | 'absolute'>('percentage');
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);
  const [expenseAdjustmentType, setExpenseAdjustmentType] = useState<'percentage' | 'absolute'>('percentage');
  const [creditUtilizationTarget, setCreditUtilizationTarget] = useState(30);
  const [projectionMonths, setProjectionMonths] = useState(6);

  // Calculate baseline metrics based on actual historical data
  const baselineMetrics = useMemo(() => {
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
      totalRevenue,
      totalExpenses,
      monthlyRevenue,
      monthlyExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }, [incomeItems, vendors]);

  // Calculate scenario projections
  const scenarioProjection = useMemo(() => {
    const months = [];
    const { monthlyRevenue: baseMonthlyRevenue, monthlyExpenses: baseMonthlyExpenses } = baselineMetrics;

    // Handle case where there's no baseline data
    if (baseMonthlyRevenue === 0 && baseMonthlyExpenses === 0) {
      for (let i = 0; i < projectionMonths; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        
        months.push({
          month: month.toLocaleDateString('en-US', { month: 'short' }),
          baselineRevenue: 0,
          baselineExpenses: 0,
          baselineNet: 0,
          scenarioRevenue: 0,
          scenarioExpenses: 0,
          scenarioNet: 0,
        });
      }
      return months;
    }

    for (let i = 0; i < projectionMonths; i++) {
      let adjustedRevenue = baseMonthlyRevenue;
      let adjustedExpenses = baseMonthlyExpenses;

      if (revenueAdjustmentType === 'percentage') {
        adjustedRevenue = baseMonthlyRevenue * (1 + revenueAdjustment / 100);
      } else {
        adjustedRevenue = baseMonthlyRevenue + revenueAdjustment;
      }

      if (expenseAdjustmentType === 'percentage') {
        adjustedExpenses = baseMonthlyExpenses * (1 + expenseAdjustment / 100);
      } else {
        adjustedExpenses = baseMonthlyExpenses + expenseAdjustment;
      }

      const month = new Date();
      month.setMonth(month.getMonth() + i);
      
      months.push({
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        baselineRevenue: baseMonthlyRevenue,
        baselineExpenses: baseMonthlyExpenses,
        baselineNet: baseMonthlyRevenue - baseMonthlyExpenses,
        scenarioRevenue: adjustedRevenue,
        scenarioExpenses: adjustedExpenses,
        scenarioNet: adjustedRevenue - adjustedExpenses,
      });
    }

    return months;
  }, [baselineMetrics, revenueAdjustment, revenueAdjustmentType, expenseAdjustment, expenseAdjustmentType, projectionMonths]);

  // Calculate cumulative impact
  const cumulativeImpact = useMemo(() => {
    const baselineTotal = scenarioProjection.reduce((sum, m) => sum + m.baselineNet, 0);
    const scenarioTotal = scenarioProjection.reduce((sum, m) => sum + m.scenarioNet, 0);
    const difference = scenarioTotal - baselineTotal;
    const percentChange = baselineTotal !== 0 ? (difference / baselineTotal) * 100 : 0;

    return {
      baselineTotal,
      scenarioTotal,
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
      projectionMonths,
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
    setProjectionMonths(scenario.scenario_data.projectionMonths);
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
    setProjectionMonths(6);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/analytics')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analytics
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

              <div>
                <Label htmlFor="projection-months">Projection Period: {projectionMonths} months</Label>
                <Slider
                  id="projection-months"
                  value={[projectionMonths]}
                  onValueChange={(value) => setProjectionMonths(value[0])}
                  min={3}
                  max={12}
                  step={1}
                  className="mt-2"
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
              <CardTitle>Net Cash Flow Comparison</CardTitle>
              <CardDescription>Monthly net income: baseline vs your scenario</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={scenarioProjection}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="baselineNet" fill="#8b5cf6" name="Baseline Net" />
                  <Bar dataKey="scenarioNet" fill="#06b6d4" name="Scenario Net" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Projection</CardTitle>
              <CardDescription>Projected monthly revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={scenarioProjection}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="baselineRevenue" stroke="#8b5cf6" strokeWidth={2} name="Baseline" />
                  <Line type="monotone" dataKey="scenarioRevenue" stroke="#10b981" strokeWidth={2} name="Scenario" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Projection</CardTitle>
              <CardDescription>Projected monthly expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={scenarioProjection}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="baselineExpenses" stroke="#8b5cf6" strokeWidth={2} name="Baseline" />
                  <Line type="monotone" dataKey="scenarioExpenses" stroke="#ef4444" strokeWidth={2} name="Scenario" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}