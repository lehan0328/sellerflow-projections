import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const DataExport = () => {
  const [selectedExportType, setSelectedExportType] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

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

  const handleExportClick = () => {
    if (!selectedExportType || !dateRange || !exportFormat) {
      toast.error("Please select transaction type, date range, and export format.");
      return;
    }

    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error("Please select both start and end dates.");
      return;
    }

    toast.success(`Exporting ${selectedExportType} as ${exportFormat.toUpperCase()}...`);
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
              disabled={!dateRange || !exportFormat || (dateRange === 'custom' && (!customStartDate || !customEndDate))}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
