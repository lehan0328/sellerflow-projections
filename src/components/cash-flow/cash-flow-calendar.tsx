import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ShoppingBag, AlertTriangle, DollarSign, Check, AlertCircle } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useUserSettings } from "@/hooks/useUserSettings";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { DayTransactionsModal } from "./day-transactions-modal";

// Utility function for consistent currency formatting
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  creditCardId?: string | null;
  poName?: string;
  source?: string; // Added to identify Amazon payouts
  date: Date;
  balanceImpactDate?: Date; // When the funds actually become available (e.g., +1 day for forecasted payouts)
}
interface IncomeItem {
  id: string;
  amount: number;
  paymentDate: Date;
  status: 'received' | 'pending' | 'overdue';
  description: string;
  source: string;
}
interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: string;
  poName?: string;
}
interface CashFlowCalendarProps {
  events?: CashFlowEvent[];
  totalCash?: number;
  onEditTransaction?: (transaction: CashFlowEvent) => void;
  onUpdateTransactionDate?: (transactionId: string, newDate: Date, eventType: 'vendor' | 'income') => Promise<void>;
  todayInflow?: number;
  todayOutflow?: number;
  upcomingExpenses?: number;
  incomeItems?: IncomeItem[];
  bankAccountBalance?: number;
  vendors?: Vendor[];
  onVendorClick?: (vendor: Vendor) => void;
  onIncomeClick?: (income: IncomeItem) => void;
  reserveAmount?: number;
  projectedDailyBalances?: Array<{
    date: Date;
    balance: number;
  }>;
  excludeToday?: boolean; // NEW: Whether to exclude today's transactions from projected balance
  safeSpendingLimit?: number; // The calculated safe spending available from useSafeSpending hook
  allBuyingOpportunities?: Array<{
    date: string;
    balance: number;
    available_date?: string;
  }>; // NEW: Buying opportunities from safe spending
  dailyBalances?: Array<{
    date: string;
    balance: number;
  }>; // NEW: Daily balance projections
}
export const CashFlowCalendar = ({
  events: propEvents = [],
  totalCash = 0,
  onEditTransaction,
  onUpdateTransactionDate,
  todayInflow = 0,
  todayOutflow = 0,
  upcomingExpenses = 0,
  incomeItems = [],
  bankAccountBalance = 0,
  vendors = [],
  onVendorClick,
  onIncomeClick,
  reserveAmount = 0,
  projectedDailyBalances = [],
  excludeToday = false,
  // Default to false (include today's transactions)
  safeSpendingLimit = 0,
  // Safe spending available to spend
  allBuyingOpportunities = [],
  // NEW: Buying opportunities
  dailyBalances = [] // NEW: Daily balance projections
}: CashFlowCalendarProps) => {
  const {
    totalAvailableCredit
  } = useCreditCards();
  const {
    chartPreferences,
    updateChartPreferences
  } = useUserSettings();

  // ALL STATE HOOKS MUST BE AT THE TOP - DO NOT ADD ANY BETWEEN DATA PROCESSING
  const [currentDate, setCurrentDate] = useState(new Date());
  const [chartTimeRange, setChartTimeRange] = useState<'1' | '3' | '6' | '12'>('3');
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowEvent | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showLowestBalanceLine, setShowLowestBalanceLine] = useState(true);
  const [lowestBalanceColor, setLowestBalanceColor] = useState('#eab308'); // Yellow for available to spend
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<CashFlowEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayTransactionsModal, setShowDayTransactionsModal] = useState(false);
  const [draggedTransaction, setDraggedTransaction] = useState<CashFlowEvent | null>(null);
  const [showCashFlowLine, setShowCashFlowLine] = useState(chartPreferences.showCashFlowLine);
  const [showTotalResourcesLine, setShowTotalResourcesLine] = useState(chartPreferences.showTotalResourcesLine);
  const [showCreditCardLine, setShowCreditCardLine] = useState(chartPreferences.showCreditCardLine);
  const [showReserveLine, setShowReserveLine] = useState(chartPreferences.showReserveLine);
  const [showForecastLine, setShowForecastLine] = useState(false);
  const [cashFlowColor, setCashFlowColor] = useState(chartPreferences.cashFlowColor);
  const [totalResourcesColor, setTotalResourcesColor] = useState(chartPreferences.totalResourcesColor);
  const [creditCardColor, setCreditCardColor] = useState(chartPreferences.creditCardColor);
  const [reserveColor, setReserveColor] = useState(chartPreferences.reserveColor);
  const [forecastColor, setForecastColor] = useState(chartPreferences.forecastColor);

  // Zoom state
  const [zoomState, setZoomState] = useState<{
    left?: number;
    right?: number;
  } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

  // Search state
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchType, setSearchType] = useState<'amount' | 'date'>('amount');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Tooltip and chart state - MUST be with other hooks
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const throttleRef = useRef<number | null>(null);
  const chartMargin = {
    top: 32,
    right: 16,
    left: 8,
    bottom: 16
  };

  // Chart resize observer
  useEffect(() => {
    if (!chartWrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (typeof w === 'number') setChartWidth(w);
    });
    ro.observe(chartWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync local state with loaded preferences
  useEffect(() => {
    setShowCashFlowLine(chartPreferences.showCashFlowLine);
    setShowTotalResourcesLine(chartPreferences.showTotalResourcesLine);
    setShowCreditCardLine(chartPreferences.showCreditCardLine);
    setShowReserveLine(chartPreferences.showReserveLine);
    setCashFlowColor(chartPreferences.cashFlowColor);
    setTotalResourcesColor(chartPreferences.totalResourcesColor);
    setCreditCardColor(chartPreferences.creditCardColor);
    setReserveColor(chartPreferences.reserveColor);
    setForecastColor(chartPreferences.forecastColor);
  }, [chartPreferences]);

  // Account start date (inclusive)
  const accountStartDate = new Date('2025-09-29');
  accountStartDate.setHours(0, 0, 0, 0);

  // Filter events to only those on/after the account start date
  let events = propEvents.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d >= accountStartDate;
  });

  // Automatically filter out overdue unmatched transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  events = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    // Keep future events
    if (eventDate >= today) return true;

    // For past events, check if they're matched/received
    // If it's an income event, check if corresponding income item is received
    if (event.type === 'inflow') {
      const correspondingIncome = incomeItems.find(income => income.description === event.description && Math.abs(income.amount - event.amount) < 0.01);
      // Keep if received, filter out if pending/overdue
      return correspondingIncome?.status === 'received';
    }

    // For vendor/purchase-order events, check if corresponding vendor is paid
    if (event.type === 'purchase-order' || event.vendor) {
      const correspondingVendor = vendors.find(vendor => vendor.name === event.vendor || vendor.poName === event.poName);
      // Keep if paid, filter out if not paid
      return correspondingVendor?.status === 'paid';
    }

    // Keep all other event types (credit payments, recurring, etc.)
    return true;
  });

  // Hide calendar monetary summaries if there's no user data
  const hasAnyData = events.length > 0 || (incomeItems?.length ?? 0) > 0;
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Always show current month view
  const calendarStartWithWeek = startOfWeek(monthStart, {
    weekStartsOn: 0
  }); // Sunday = 0
  const calendarEndWithWeek = endOfWeek(monthEnd, {
    weekStartsOn: 0
  });
  const days = eachDayOfInterval({
    start: calendarStartWithWeek,
    end: calendarEndWithWeek
  });
  const weeksInView = Math.ceil(days.length / 7);
  const is6Rows = weeksInView > 5;
  const gridRowsClass = is6Rows ? 'grid-rows-6' : 'grid-rows-5';
  const cellHeightClass = is6Rows ? 'h-[70px]' : 'h-[85px]';

  const getAvailableCreditForDay = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    // Start with current total available credit
    let availableCredit = totalAvailableCredit;

    // Get all credit card PURCHASES up to target date (these DECREASE available credit)
    const creditCardPurchasesUpToDay = events.filter(event => {
      if (!event.creditCardId) return false; // Only credit card purchases
      const ed = new Date(event.date);
      ed.setHours(0, 0, 0, 0);
      return ed <= target;
    });

    // Subtract purchases made with credit cards
    creditCardPurchasesUpToDay.forEach(purchase => {
      availableCredit -= purchase.amount;
    });

    // Get all credit card PAYMENTS up to target date (these INCREASE available credit when paid)
    const creditPaymentsUpToDay = events.filter(event => {
      if (event.type !== 'credit-payment') return false;
      const ed = new Date(event.date);
      ed.setHours(0, 0, 0, 0);
      return ed <= target;
    });

    // Add back credit when payments are made (paying off the card increases available credit)
    creditPaymentsUpToDay.forEach(payment => {
      availableCredit += payment.amount;
    });
    return Math.max(0, availableCredit);
  };


  // Calculate average Amazon payout from historical confirmed payouts
  const averageAmazonPayout = (() => {
    const confirmedPayouts = events.filter(e => e.source === 'Amazon' && e.type === 'inflow');
    if (confirmedPayouts.length === 0) return 0;
    const total = confirmedPayouts.reduce((sum, e) => sum + e.amount, 0);
    return total / confirmedPayouts.length;
  })();

  // Generate chart data based on selected time range
  const generateChartData = () => {
    // Calculate date range based on selected time range (starting from today)
    const monthsToShow = parseInt(chartTimeRange);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chartStart = today; // Start from today
    const chartEnd = endOfMonth(addMonths(today, monthsToShow)); // End at the end of month X months from now

    const days = eachDayOfInterval({
      start: chartStart,
      end: chartEnd
    });

    // CRITICAL: Always calculate projected balances cumulatively from bank balance
    // Day 0 (today) = bank balance
    // Day 1 = Day 0 + Day 1 net cash flow
    // Day 2 = Day 1 + Day 2 net cash flow, etc.

    let runningTotal = bankAccountBalance; // Start with actual bank balance today
    let cumulativeInflow = 0;
    let cumulativeOutflow = 0;
    return days.map((day, dayIndex) => {
      const dayEvents = events.filter(event => {
        // Use balanceImpactDate if available (for forecasted payouts), otherwise use date
        const impactDate = event.balanceImpactDate || event.date;
        const checkDate = new Date(day);
        const bcheckDate = new Date(impactDate);
        return format(impactDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      const dailyInflow = dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyOutflow = dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyChange = dailyInflow - dailyOutflow;
      cumulativeInflow += dailyInflow;
      cumulativeOutflow += dailyOutflow;
      const dayToCheck = new Date(day);
      dayToCheck.setHours(0, 0, 0, 0);
      const isToday = format(dayToCheck, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

      // CRITICAL: Projected balance calculation
      // For today: Start with bank balance, add today's transactions UNLESS excludeToday is enabled
      // For future days: Add daily changes cumulatively
      if (isToday) {
        runningTotal = bankAccountBalance + (excludeToday ? 0 : dailyChange);
      } else {
        runningTotal += dailyChange;
      }

      // Check if this day has an Amazon payout
      const hasAmazonPayout = dayEvents.some(e => e.source === 'Amazon' && e.type === 'inflow');
      const hasAmazonForecast = dayEvents.some(e => e.source === 'Amazon-Forecasted' && e.type === 'inflow');

      // Group events by type for detailed breakdown
      const inflowEvents = dayEvents.filter(e => e.type === 'inflow');
      const purchaseOrderEvents = dayEvents.filter(e => e.type === 'purchase-order');
      const creditPaymentEvents = dayEvents.filter(e => e.type === 'credit-payment');
      const outflowEvents = dayEvents.filter(e => e.type === 'outflow');

      // Check if any credit card transactions on this day
      const hasCreditCardTransaction = dayEvents.some(e => e.creditCardId || e.type === 'credit-payment');

      // Calculate pending/overdue for this specific date
      const dayPendingIncome = incomeItems.filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        return incomeDate <= dayToCheck && incomeDate >= today;
      }).reduce((sum, income) => sum + income.amount, 0);
      const dayOverdueIncome = incomeItems.filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        return incomeDate < today;
      }).reduce((sum, income) => sum + income.amount, 0);
      const dayOverdueVendors = vendors.filter(vendor => {
        if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
        const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
        return paymentDate < today;
      }).reduce((sum, vendor) => sum + vendor.nextPaymentAmount, 0);

      // Calculate available credit for this specific day
      const availableCreditForDay = getAvailableCreditForDay(day);
      return {
        date: format(day, 'MMM dd'),
        fullDate: day,
        cashFlow: runningTotal,
        cashBalance: runningTotal,
        forecastPayout: runningTotal,
        // Now aligned with cash balance
        totalResources: runningTotal + availableCreditForDay,
        availableCredit: runningTotal + availableCreditForDay,
        creditCardBalance: availableCreditForDay,
        creditCardCredit: availableCreditForDay,
        reserve: reserveAmount,
        reserveAmount: reserveAmount,
        // Projected balance line: now same as cash balance (unified calculation)
        projectedBalance: dayToCheck >= today ? runningTotal : null,
        dailyChange,
        inflow: dailyInflow,
        outflow: dailyOutflow,
        cumulativeInflow,
        cumulativeOutflow,
        transactions: dayEvents,
        inflowEvents,
        purchaseOrderEvents,
        creditPaymentEvents,
        outflowEvents,
        pendingIncome: dayPendingIncome,
        overdueIncome: dayOverdueIncome,
        overdueVendors: dayOverdueVendors,
        hasAmazonPayout,
        hasAmazonForecast,
        hasCreditCardTransaction
      };
    });
  };
  const chartData = generateChartData();

  // Get zoomed data based on zoom state
  const getDisplayData = () => {
    if (!zoomState) return chartData;
    const {
      left = 0,
      right = chartData.length - 1
    } = zoomState;
    return chartData.slice(left, right + 1);
  };
  const displayData = getDisplayData();

  // Use the safe spending limit directly from the safe spending calculation
  // This ensures the calendar shows the exact same "Available to Spend" as the stats box
  const lowestProjectedBalance = safeSpendingLimit;

  // Memoize Y-axis domain calculation
  const yDomain = useMemo((): [number, number] => {
    const yValues = displayData.flatMap((d: any) => [d.cashBalance, d.totalResources, d.creditCardBalance, d.reserveAmount, d.projectedBalance, d.cashFlow].filter((v: any) => typeof v === 'number')) as number[];

    // Include the lowest projected balance (available to spend) in the domain
    if (typeof lowestProjectedBalance === 'number' && !isNaN(lowestProjectedBalance)) {
      yValues.push(lowestProjectedBalance);
    }
    const yMin = yValues.length ? Math.min(...yValues) : 0;
    const yMax = yValues.length ? Math.max(...yValues) : 0;
    const yRange = Math.max(1, yMax - yMin);
    const yPadding = Math.max(1000, Math.round(yRange * 0.05));
    return [yMin - yPadding, yMax + yPadding];
  }, [displayData, lowestProjectedBalance]);
  const getChartInnerWidth = () => {
    const svg = chartWrapperRef.current?.querySelector('svg.recharts-surface') as SVGElement | null;
    return svg?.clientWidth || chartWidth || 0;
  };

  // Compute data index from a clientX position relative to the inner plot area
  const computeIndexFromClientX = (clientX: number) => {
    const svg = chartWrapperRef.current?.querySelector('svg.recharts-surface') as SVGElement | null;
    const grid = chartWrapperRef.current?.querySelector('.recharts-cartesian-grid') as SVGGElement | null;
    if (svg && grid) {
      const svgRect = svg.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const innerLeft = gridRect.left - svgRect.left; // inner plot offset from svg left
      const plotW = Math.max(1, gridRect.width);
      const relX = Math.min(Math.max(clientX - svgRect.left - innerLeft, 0), plotW);
      const fraction = relX / plotW;
      const idx = Math.round(fraction * (displayData.length - 1));
      return Math.max(0, Math.min(displayData.length - 1, idx));
    }

    // Fallback using wrapper + margins
    const wrapperLeft = chartWrapperRef.current?.getBoundingClientRect().left ?? 0;
    const innerW = getChartInnerWidth();
    const plotW = Math.max(1, innerW - (chartMargin.left + chartMargin.right));
    const relX = Math.min(Math.max(clientX - wrapperLeft - chartMargin.left, 0), plotW);
    const fraction = relX / plotW;
    const idx = Math.round(fraction * (displayData.length - 1));
    return Math.max(0, Math.min(displayData.length - 1, idx));
  };

  // Wrapper-level handlers to keep tooltip active across the whole chart area (including left margins)
  const handleWrapperMouseMove = useCallback((ev: any) => {
    if (throttleRef.current) return;
    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
    }, 50); // Increased throttle for better performance

    const idx = computeIndexFromClientX(ev.clientX);
    setActiveTooltipIndex(idx);
  }, [displayData.length]);

  // Memoize colors to prevent function recreation
  const memoizedColors = useMemo(() => {
    const cashColor = cashFlowColor?.startsWith?.('hsl') ? '#3b82f6' : cashFlowColor;
    return {
      cashColor,
      totalResourcesColor,
      creditCardColor,
      reserveColor
    };
  }, [cashFlowColor, totalResourcesColor, creditCardColor, reserveColor]);
  const buildTooltipPayload = useCallback((index: number) => {
    const d = displayData[index as number];
    if (!d) return [];
    const items: any[] = [];
    const safePush = (key: string, color: string) => {
      const v = (d as any)[key];
      if (typeof v === 'number') items.push({
        dataKey: key,
        name: key,
        value: v,
        color,
        payload: d
      });
    };
    const {
      cashColor,
      totalResourcesColor,
      creditCardColor,
      reserveColor
    } = memoizedColors;
    safePush('totalResources', totalResourcesColor);
    safePush('cashBalance', cashColor);
    safePush('creditCardBalance', creditCardColor);
    safePush('reserveAmount', reserveColor);
    safePush('projectedBalance', '#9333ea');

    // Include bar chart keys for completeness
    safePush('cashFlow', cashColor);
    safePush('availableCredit', totalResourcesColor);
    safePush('creditCardCredit', creditCardColor);
    safePush('reserve', reserveColor);
    return items;
  }, [displayData, memoizedColors]);

  // Memoize tooltip payload to prevent recalculation on every render
  const tooltipPayload = useMemo(() => {
    if (activeTooltipIndex === null) return [];
    return buildTooltipPayload(activeTooltipIndex);
  }, [activeTooltipIndex, buildTooltipPayload]);

  // Zoom handlers
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
    }
  };
  const handleMouseMove = (e: any) => {
    if (!e) return;
    let idx: number | null = null;

    // Primary: use Recharts' computed index
    if (typeof e.activeTooltipIndex === 'number') {
      idx = e.activeTooltipIndex;
    }
    // Secondary: find by label
    else if (e.activeLabel) {
      const i = displayData.findIndex((d: any) => d.date === e.activeLabel);
      if (i !== -1) idx = i;
    }
    // Tertiary: use activeCoordinate if available (relative to inner plot)
    else if (e.activeCoordinate && typeof e.activeCoordinate.x === 'number') {
      const svg = chartWrapperRef.current?.querySelector('svg.recharts-surface') as SVGElement | null;
      const grid = chartWrapperRef.current?.querySelector('.recharts-cartesian-grid') as SVGGElement | null;
      if (svg && grid) {
        const gridRect = grid.getBoundingClientRect();
        const plotW = Math.max(1, gridRect.width);
        const relX = Math.min(Math.max(e.activeCoordinate.x, 0), plotW);
        const fraction = relX / plotW;
        const calculatedIndex = Math.round(fraction * (displayData.length - 1));
        idx = Math.max(0, Math.min(displayData.length - 1, calculatedIndex));
      } else {
        // Fall back to chartX mapping via helper when grid isn't found
        idx = computeIndexFromClientX((e as any).clientX ?? 0);
      }
    }
    // Ultimate fallback: compute from cursor X using document coordinates
    else if (typeof e.chartX === 'number' || typeof (e as any).clientX === 'number') {
      const clientX = (e as any).clientX ?? 0;
      idx = computeIndexFromClientX(clientX);
    }
    if (idx !== null) setActiveTooltipIndex(idx);
    if (refAreaLeft && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };
  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      const leftIndex = chartData.findIndex(d => d.date === refAreaLeft);
      const rightIndex = chartData.findIndex(d => d.date === refAreaRight);
      if (leftIndex !== -1 && rightIndex !== -1) {
        const left = Math.min(leftIndex, rightIndex);
        const right = Math.max(leftIndex, rightIndex);
        if (right - left > 0) {
          setZoomState({
            left,
            right
          });
        }
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };
  const handleZoomOut = () => {
    setZoomState(null);
  };
  const handleChartClick = (data: any) => {
    // Only handle chart click if we're not in zoom selection mode
    if (refAreaLeft || refAreaRight) return;
    if (data && data.activePayload && data.activePayload[0]) {
      const dayData = data.activePayload[0].payload;
      const transactions = dayData.transactions || [];
      if (transactions.length === 1) {
        // Single transaction - show individual transaction modal
        setSelectedTransaction(transactions[0]);
        setShowTransactionModal(true);
      } else if (transactions.length > 1) {
        // Multiple transactions - show day transactions modal
        setSelectedDayTransactions(transactions);
        setSelectedDate(dayData.fullDate);
        setShowDayTransactionsModal(true);
      }
    }
  };
  const chartConfig = {
    cashBalance: {
      label: "Cash Balance",
      color: cashFlowColor
    },
    totalResources: {
      label: "Total Resources",
      color: totalResourcesColor
    },
    creditCardBalance: {
      label: "Available Credit",
      color: creditCardColor
    },
    reserveAmount: {
      label: "Reserve Amount",
      color: reserveColor
    },
    forecastPayout: {
      label: "Forecast Payout",
      color: forecastColor
    }
  };
  return <Card className="shadow-card h-[700px] flex flex-col bg-background/10 backdrop-blur-sm">
      <div className="relative flex-shrink-0">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <CardTitle className="text-lg">Cash Flow Visualization</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Healthy</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={() => setShowSearchDialog(true)} variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Search by Amount or Date
                </Button>
                <Select value={chartTimeRange} onValueChange={(value: '1' | '3' | '6' | '12') => setChartTimeRange(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
    </div>

    <CardContent className="p-6">
        <div className="flex flex-col">
          <div className="relative w-full" style={{
          height: '560px'
        }} ref={chartWrapperRef}>
                 <div className="flex justify-between items-center mb-2 px-4">
                 <p className="text-sm text-muted-foreground">
                   {zoomState ? 'Click and drag to zoom in further • ' : 'Click and drag to zoom into a specific time period • '}
                   <span className="text-primary font-medium">
                     {displayData.length} days shown
                   </span>
                 </p>
                 {zoomState && <Button variant="outline" size="sm" onClick={handleZoomOut} className="text-xs">
                     Reset Zoom
                   </Button>}
               </div>
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={displayData} onClick={handleChartClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setActiveTooltipIndex(null)} margin={chartMargin} syncMethod="index">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{
                  fontSize: 12
                }} interval="preserveStartEnd" />
                       <YAxis tick={{
                  fontSize: 12
                }} tickFormatter={value => `$${(value / 1000).toFixed(0)}k`} domain={yDomain} allowDataOverflow />
                       <ChartTooltip isAnimationActive={false} allowEscapeViewBox={{
                  x: true,
                  y: true
                }} cursor={{
                  strokeDasharray: '3 3'
                }} position={{
                  x: 12,
                  y: 12
                }} wrapperStyle={{
                  pointerEvents: 'none'
                }} active={activeTooltipIndex !== null} payload={tooltipPayload} label={activeTooltipIndex !== null ? displayData[activeTooltipIndex]?.date : undefined} content={<ChartTooltipContent formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    totalResources: "Total Resources:",
                    cashBalance: "Cash Flow:",
                    creditCardBalance: "Available Credit:",
                    reserveAmount: "Reserve Amount:",
                    forecastPayout: "Forecast Payout:",
                    projectedBalance: "Projected Balance:",
                    cashFlow: "Cash Flow:",
                    availableCredit: "Total Resources:",
                    creditCardCredit: "Available Credit:",
                    reserve: "Reserve Amount:"
                  };
                  return [labels[name] || name, `$${formatCurrency(value)}`];
                }} itemSorter={item => {
                  const order = ["totalResources", "cashBalance", "creditCardBalance", "reserveAmount", "forecastPayout", "projectedBalance", "cashFlow", "availableCredit", "creditCardCredit", "reserve"];
                  return order.indexOf(item.dataKey as string);
                }} />} labelFormatter={useCallback((label, payload) => {
                  if (!payload?.[0]) return label;
                  const data = payload[0].payload;
                  const hasTransactions = data.transactions?.length > 0;
                  return <div className="space-y-2 min-w-[300px]">
                              <p className="font-semibold text-base border-b pb-2">{label}</p>

                              {data.hasAmazonPayout && <p className="text-orange-600 font-medium flex items-center gap-1">
                                  <ShoppingBag className="h-3 w-3" />
                                  Amazon Payout
                                </p>}
                              {data.hasAmazonForecast && <p className="text-purple-600 font-medium flex items-center gap-1">
                                  <ShoppingBag className="h-3 w-3" />
                                  Amazon Payout (Forecasted)
                                </p>}

                              <div className="space-y-1">
                                <p className="font-bold text-base">
                                  Projected Balance: <span className="text-primary">${data.cashFlow?.toLocaleString()}</span>
                                </p>
                                {data.dailyChange !== 0 && <p className={data.dailyChange > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    Daily Net: {data.dailyChange > 0 ? '+' : ''}${Math.abs(data.dailyChange).toLocaleString()}
                                  </p>}
                              </div>

                              {hasTransactions && <div className="space-y-1.5 border-t pt-2">
                                  <p className="font-semibold text-xs uppercase text-muted-foreground">Daily Activity</p>
                                   {data.inflow > 0 && <p className="text-green-600 font-medium">↑ Inflows: +${formatCurrency(data.inflow)}</p>}
                                   {data.outflow > 0 && <p className="text-red-600 font-medium">↓ Outflows: -${formatCurrency(data.outflow)}</p>}
                                </div>}

                              {(data.overdueIncome > 0 || data.overdueVendors > 0) && <div className="space-y-1 border-t pt-2">
                                  <p className="font-semibold text-xs uppercase text-muted-foreground">Outstanding</p>
                                  {data.overdueIncome > 0 && <p className="text-xs text-red-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Overdue Income: ${data.overdueIncome.toLocaleString()}
                                    </p>}
                                  {data.overdueVendors > 0 && <p className="text-xs text-red-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Overdue Vendors: ${data.overdueVendors.toLocaleString()}
                                    </p>}
                                </div>}
                            </div>;
                }, [])} />
                       {showCashFlowLine && <Line type="monotone" dataKey="cashBalance" stroke={cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor} strokeWidth={2} dot={(props: any) => {
                  const {
                    cx,
                    cy,
                    payload,
                    index
                  } = props;

                  // Always render an invisible dot to enable hovering on all dates
                  // Larger radius (16px) for better hover detection
                  if (!payload.transactions || payload.transactions.length === 0) {
                    return <circle key={`cash-empty-${index}`} cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />;
                  }

                  // Don't show dots for forecasted Amazon payouts but keep hover area
                  if (payload.hasAmazonForecast) {
                    return <circle key={`cash-forecast-${index}`} cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />;
                  }
                  if (payload.hasAmazonPayout) {
                    // Confirmed payout - orange with large hover area
                    return <g key={`cash-payout-${index}`}>
                                  <circle cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />
                                  <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#ea580c" strokeWidth={2} />
                                  <circle cx={cx} cy={cy} r={3} fill="#fff" />
                                </g>;
                  }
                  const fillColor = cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor;
                  return <g key={`cash-dot-${index}`}>
                                <circle cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />
                                <circle cx={cx} cy={cy} r={4} fill={fillColor} cursor="pointer" />
                              </g>;
                }} activeDot={{
                  r: 8,
                  cursor: 'pointer',
                  strokeWidth: 0
                }} />}
                       {showTotalResourcesLine && <Line type="monotone" dataKey="totalResources" stroke={totalResourcesColor} strokeWidth={2} dot={false} activeDot={{
                  r: 8,
                  cursor: 'pointer',
                  strokeWidth: 0
                }} />}
                      {showCreditCardLine && <Line type="monotone" dataKey="creditCardBalance" stroke={creditCardColor} strokeWidth={2} dot={(props: any) => {
                  const {
                    cx,
                    cy,
                    payload,
                    index
                  } = props;
                  if (payload.hasCreditCardTransaction) {
                    return <g key={`credit-balance-${index}`}>
                                  <circle cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />
                                  <circle cx={cx} cy={cy} r={4} fill={creditCardColor} stroke="white" strokeWidth={2} />
                                </g>;
                  }
                  return <circle key={`credit-balance-empty-${index}`} cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />;
                }} activeDot={{
                  r: 8,
                  cursor: 'pointer',
                  strokeWidth: 0
                }} />}
                       {showReserveLine && <Line type="monotone" dataKey="reserveAmount" stroke={reserveColor} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{
                  r: 8,
                  cursor: 'pointer',
                  strokeWidth: 0
                }} />}
                       {/* Purple line for forecasted Amazon payouts */}
                       <Line type="monotone" dataKey="forecastPayout" stroke="#9333ea" strokeWidth={2} dot={false} activeDot={{
                  r: 8,
                  cursor: 'pointer',
                  strokeWidth: 0
                }} />
                        {showForecastLine && <>
                          {/* Projected Balance line - Cash + Forecasts (Purple) - includes mathematical forecasted payouts */}
                          <Line type="monotone" dataKey="projectedBalance" stroke="#9333ea" strokeWidth={2} strokeDasharray="3 3" dot={(props: any) => {
                    const {
                      cx,
                      cy,
                      index
                    } = props;
                    // Invisible hover area for forecast line
                    return <circle key={`forecast-${index}`} cx={cx} cy={cy} r={16} fill="transparent" cursor="pointer" />;
                  }} activeDot={{
                    r: 8,
                    cursor: 'pointer',
                    strokeWidth: 0
                  }} name="Projected Cash Balance (with Mathematical Forecasts)" />
                         </>}
                       {showLowestBalanceLine && <ReferenceLine y={lowestProjectedBalance} stroke={lowestBalanceColor} strokeWidth={2} strokeDasharray="3 3" label={{
                  value: 'Available to Spend',
                  position: 'insideTopRight',
                  fill: lowestBalanceColor,
                  fontSize: 12
                }} />}
                       {refAreaLeft && refAreaRight && <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="hsl(var(--primary))" fillOpacity={0.3} />}
                      </LineChart>
                  </ResponsiveContainer>
            </ChartContainer>
          </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t flex-shrink-0">
          <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="resources-toggle" checked={showTotalResourcesLine} onChange={e => {
                setShowTotalResourcesLine(e.target.checked);
                updateChartPreferences({
                  showTotalResourcesLine: e.target.checked
                });
              }} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="resources-color" className="cursor-pointer">
                    <input type="color" id="resources-color" value={totalResourcesColor} onChange={e => {
                  setTotalResourcesColor(e.target.value);
                  updateChartPreferences({
                    totalResourcesColor: e.target.value
                  });
                }} className="w-3 h-3 rounded cursor-pointer border-0 p-0" style={{
                  appearance: 'none',
                  backgroundColor: totalResourcesColor
                }} />
                  </label>
                  <label htmlFor="resources-toggle" className="cursor-pointer">Total Resources (Cash + Credit)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cashflow-toggle" checked={showCashFlowLine} onChange={e => {
                setShowCashFlowLine(e.target.checked);
                updateChartPreferences({
                  showCashFlowLine: e.target.checked
                });
              }} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="cashflow-color" className="cursor-pointer">
                    <input type="color" id="cashflow-color" value={cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor} onChange={e => {
                  setCashFlowColor(e.target.value);
                  updateChartPreferences({
                    cashFlowColor: e.target.value
                  });
                }} className="w-3 h-3 rounded cursor-pointer border-0 p-0" style={{
                  appearance: 'none',
                  backgroundColor: cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor
                }} />
                  </label>
                  <label htmlFor="cashflow-toggle" className="cursor-pointer">Cash Balance</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="credit-toggle" checked={showCreditCardLine} onChange={e => {
                setShowCreditCardLine(e.target.checked);
                updateChartPreferences({
                  showCreditCardLine: e.target.checked
                });
              }} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="credit-color" className="cursor-pointer">
                    <input type="color" id="credit-color" value={creditCardColor} onChange={e => {
                  setCreditCardColor(e.target.value);
                  updateChartPreferences({
                    creditCardColor: e.target.value
                  });
                }} className="w-3 h-3 rounded cursor-pointer border-0 p-0" style={{
                  appearance: 'none',
                  backgroundColor: creditCardColor
                }} />
                  </label>
                  <label htmlFor="credit-toggle" className="cursor-pointer">Available Credit</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reserve-toggle" checked={showReserveLine} onChange={e => {
                setShowReserveLine(e.target.checked);
                updateChartPreferences({
                  showReserveLine: e.target.checked
                });
              }} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="reserve-color" className="cursor-pointer">
                    <input type="color" id="reserve-color" value={reserveColor} onChange={e => {
                  setReserveColor(e.target.value);
                  updateChartPreferences({
                    reserveColor: e.target.value
                  });
                }} className="w-3 h-3 rounded cursor-pointer border-0 p-0" style={{
                  appearance: 'none',
                  backgroundColor: reserveColor
                }} />
                  </label>
                  <label htmlFor="reserve-toggle" className="cursor-pointer">Reserve Amount</label>
            </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="lowest-balance-toggle" checked={showLowestBalanceLine} onChange={e => {
                setShowLowestBalanceLine(e.target.checked);
                updateChartPreferences({
                  showLowestBalanceLine: e.target.checked
                });
              }} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="lowest-balance-color" className="cursor-pointer">
                    <input type="color" id="lowest-balance-color" value={lowestBalanceColor} onChange={e => {
                  setLowestBalanceColor(e.target.value);
                  updateChartPreferences({
                    lowestBalanceColor: e.target.value
                  });
                }} className="w-3 h-3 rounded cursor-pointer border-0 p-0" style={{
                  appearance: 'none',
                  backgroundColor: lowestBalanceColor
                }} />
                  </label>
                  <label htmlFor="lowest-balance-toggle" className="cursor-pointer flex items-center gap-1">
                    Lowest Projected
                    <span className="text-xs text-muted-foreground">
                      (${Math.round(lowestProjectedBalance).toLocaleString()})
                    </span>
                  </label>
                </div>
          </div>

        </div>
        </div>
      </CardContent>

      <TransactionDetailModal transaction={selectedTransaction} open={showTransactionModal} onOpenChange={setShowTransactionModal} onEdit={onEditTransaction} />

      <DayTransactionsModal transactions={selectedDayTransactions} date={selectedDate} open={showDayTransactionsModal} onOpenChange={setShowDayTransactionsModal} />
      
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Search Buying Opportunities
            </DialogTitle>
            <DialogDescription>
              Search by amount to find when you can spend it, or by date to see how much you can spend on that day. All results reflect transactions within the next 3 months only.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'amount' | 'date')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Search by Amount
              </TabsTrigger>
              <TabsTrigger value="date" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Search by Date
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="amount" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="search-amount">Enter amount you want to spend</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="search-amount"
                      type="number"
                      placeholder="0.00"
                      value={searchAmount}
                      onChange={(e) => setSearchAmount(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                {searchAmount && parseFloat(searchAmount) > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const amount = parseFloat(searchAmount);
                      // Find the earliest opportunity where balance >= amount
                      const matchingOpp = allBuyingOpportunities.find(opp => opp.balance >= amount);
                      
                      if (!matchingOpp) {
                        return (
                          <div className="text-center p-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No opportunities found for ${searchAmount}</p>
                            <p className="text-sm mt-2">Try a lower amount or check back later</p>
                          </div>
                        );
                      }
                      
                      const [year, month, day] = matchingOpp.date.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      let availableDate = '';
                      if (matchingOpp.available_date) {
                        const [aYear, aMonth, aDay] = matchingOpp.available_date.split('-').map(Number);
                        const aDate = new Date(aYear, aMonth - 1, aDay);
                        availableDate = aDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                      
                      return (
                        <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                ${matchingOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-muted-foreground">Available</div>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                              Can afford ${searchAmount}
                            </Badge>
                          </div>
                          <Separator className="my-2" />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Low Point Date:</span>
                              <span className="font-medium">{formattedDate}</span>
                            </div>
                            {availableDate && (
                              <div className="flex justify-between p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <span className="text-blue-700 dark:text-blue-400 font-medium">Earliest Purchase:</span>
                                <span className="font-bold text-blue-600">{availableDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Enter an amount to see when you can spend it</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="date" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="search-date">Select a date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchDate ? format(new Date(searchDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={searchDate ? new Date(searchDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setSearchDate(format(date, "yyyy-MM-dd"));
                        } else {
                          setSearchDate('');
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                {searchDate ? (
                  <div className="space-y-3">
                    {(() => {
                      const searchDateObj = new Date(searchDate + 'T00:00:00');
                      
                      // Find the opportunity where the selected date falls within the range [earliest_purchase_date, low_point_date]
                      let relevantOpp = null;
                      for (const opp of allBuyingOpportunities) {
                        const [year, month, day] = opp.date.split('-').map(Number);
                        const lowPointDate = new Date(year, month - 1, day);
                        
                        let earliestPurchaseDate = lowPointDate;
                        if (opp.available_date) {
                          const [aYear, aMonth, aDay] = opp.available_date.split('-').map(Number);
                          earliestPurchaseDate = new Date(aYear, aMonth - 1, aDay);
                        }
                        
                        // Check if selected date is within the opportunity range
                        if (searchDateObj >= earliestPurchaseDate && searchDateObj <= lowPointDate) {
                          relevantOpp = opp;
                          break;
                        }
                      }
                      
                      // If no opportunity matches, show a message
                      if (!relevantOpp) {
                        return (
                          <div className="text-center p-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No buying opportunity available for this date</p>
                            <p className="text-sm mt-2">The selected date doesn't fall within any opportunity range</p>
                          </div>
                        );
                      }
                      
                      const [year, month, day] = relevantOpp.date.split('-').map(Number);
                      const lowDate = new Date(year, month - 1, day);
                      const formattedLowDate = lowDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      let availableDate = '';
                      let earliestPurchaseDate = lowDate;
                      if (relevantOpp.available_date) {
                        const [aYear, aMonth, aDay] = relevantOpp.available_date.split('-').map(Number);
                        earliestPurchaseDate = new Date(aYear, aMonth - 1, aDay);
                        availableDate = earliestPurchaseDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                      
                      const canPurchase = searchDateObj >= earliestPurchaseDate;
                      
                      return (
                        <div className="p-6 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                          <div className="text-center mb-4">
                            <div className="text-xs text-muted-foreground mb-2">
                              On {new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-4xl font-bold text-blue-600">
                              ${relevantOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Available to spend</div>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="space-y-3">
                            <div className={`p-3 rounded-lg ${canPurchase ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                {canPurchase ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                )}
                                <span className={`text-sm font-semibold ${canPurchase ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                  {canPurchase ? 'Ready to Purchase' : 'Not Yet Available'}
                                </span>
                              </div>
                              {!canPurchase && availableDate && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  Earliest purchase date: {availableDate}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Based on low point:</span>
                                <span className="font-medium">{formattedLowDate}</span>
                              </div>
                              <p className="text-muted-foreground italic">
                                Assumes $0 spending between now and the selected date
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a date to see available spending amount</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>;
};