import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, CalendarIcon } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const DataExport = () => {
  const { user } = useAuth();
  const [selectedExportType, setSelectedExportType] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportTypeChange = (value: string) => {
    setSelectedExportType(value);
    setDateRange('');
    setExportFormat('');
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setShowCustomDatePicker(false);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setShowCustomDatePicker(value === 'custom');
  };

  const getDateRangeValues = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'last-month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'this-month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last-90-days':
        startDate = subDays(now, 90);
        break;
      case 'custom':
        startDate = customStartDate!;
        endDate = customEndDate!;
        break;
      default:
        startDate = now;
    }

    return { startDate, endDate };
  };

  const fetchTransactionData = async () => {
    if (!user) return [];

    const { startDate, endDate } = getDateRangeValues();
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    let query;
    
    switch (selectedExportType) {
      case 'vendor':
        query = supabase
          .from('transactions')
          .select('*, vendors(name, category)')
          .eq('user_id', user.id)
          .eq('type', 'purchase_order')
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr)
          .order('transaction_date', { ascending: false });
        break;
      case 'income':
        query = supabase
          .from('income')
          .select('*, customers(name)')
          .eq('user_id', user.id)
          .gte('payment_date', startDateStr)
          .lte('payment_date', endDateStr)
          .order('payment_date', { ascending: false });
        break;
      case 'recurring':
        query = supabase
          .from('recurring_expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });
        break;
      default:
        return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch transaction data');
      return [];
    }

    return data || [];
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    // Define headers
    const headers = ['Created Date', 'Description/PO', 'Amount', 'Due Date', 'Last Remarks'];
    
    // Map data to required fields based on transaction type
    const rows = data.map(row => {
      const createdDate = format(new Date(row.created_at), 'yyyy-MM-dd');
      const description = row.description || row.name || row.transaction_name || '';
      const amount = row.amount || 0;
      const dueDate = row.due_date ? format(new Date(row.due_date), 'yyyy-MM-dd') : 
                      row.payment_date ? format(new Date(row.payment_date), 'yyyy-MM-dd') : '';
      const remarks = row.remarks || row.notes || row.status || '';
      
      // Escape commas and quotes in CSV
      const escapeCSV = (val: any) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      return [createdDate, description, amount, dueDate, remarks]
        .map(escapeCSV)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportClick = async () => {
    if (!selectedExportType || !dateRange || !exportFormat) {
      toast.error("Please select transaction type, date range, and export format.");
      return;
    }

    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error("Please select both start and end dates.");
      return;
    }

    setIsExporting(true);

    try {
      const data = await fetchTransactionData();

      if (data.length === 0) {
        toast.error("No transactions found for the selected date range.");
        setIsExporting(false);
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
      const filename = `${selectedExportType}-transactions-${timestamp}`;

      if (exportFormat === 'csv') {
        const csvContent = convertToCSV(data);
        downloadFile(csvContent, `${filename}.csv`, 'text/csv');
        toast.success(`Exported ${data.length} transactions as CSV`);
      } else if (exportFormat === 'excel' || exportFormat === 'pdf') {
        toast.error(`${exportFormat.toUpperCase()} export is coming soon! Please use CSV for now.`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Data Export</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Transaction Type</label>
          <Select value={selectedExportType} onValueChange={handleExportTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select transaction type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendor">Vendor Transaction</SelectItem>
              <SelectItem value="income">Income Transaction</SelectItem>
              <SelectItem value="recurring">Recurring Transaction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedExportType && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCustomDatePicker && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="excel">Export Excel</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExportClick}
              className="w-full"
              disabled={!dateRange || !exportFormat || (dateRange === 'custom' && (!customStartDate || !customEndDate)) || isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
