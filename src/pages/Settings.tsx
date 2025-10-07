import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  ArrowLeft,
  Download,
  FileText,
  Sun,
  Moon,
  Monitor,
  Palette,
  Database,
  Trash2,
  AlertTriangle,
  CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarNavigation } from "@/components/settings/sidebar-navigation";
import { CreditCardManagement } from "@/components/settings/credit-card-management";
import { VendorManagement } from "@/components/settings/vendor-management";
import { AmazonManagement } from "@/components/settings/amazon-management";
import { BankAccountManagement } from "@/components/settings/bank-account-management";
import { CustomerManagement } from "@/components/settings/customer-management";
import { FeatureRequest } from "@/components/settings/feature-request";
import { RecurringExpenseManagement } from "@/components/settings/recurring-expense-management";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageLoadingWrapper } from "@/components/PageLoadingWrapper";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { first_name?: string; last_name?: string; company?: string; currency?: string }) => {
      if (!user?.id) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Failed to update settings');
    },
  });

  // Set currency from profile data
  useEffect(() => {
    if (profile?.currency) {
      setSelectedCurrency(profile.currency);
    }
  }, [profile]);

  // Update active section based on location state or URL params
  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section');
    const state = location.state as { activeSection?: string };
    
    if (sectionParam) {
      setActiveSection(sectionParam);
    } else if (state?.activeSection) {
      setActiveSection(state.activeSection);
    }
  }, [location]);

  const handleProfileChange = (field: string, value: string) => {
    const profileData = {
      [field]: value,
    };
    updateProfileMutation.mutate(profileData);
  };

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} data...`);
    // Here you would implement the actual export functionality
  };

  const handleClearAllData = async () => {
    try {
      if (!user?.id) {
        toast.error("No user found");
        return;
      }

      // Delete all transactions FIRST to avoid foreign key issues
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (transactionsError) throw transactionsError;

      // Delete all income
      const { error: incomeError } = await supabase
        .from('income')
        .delete()
        .eq('user_id', user.id);

      if (incomeError) throw incomeError;

      // Delete all vendors LAST (after dependent transactions are gone)
      const { error: vendorsError } = await supabase
        .from('vendors')
        .delete()
        .eq('user_id', user.id);

      if (vendorsError) throw vendorsError;

      // Reset total cash to 0
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({ total_cash: 0 })
        .eq('user_id', user.id);

      if (settingsError) throw settingsError;

      // Clear local storage balance flag
      localStorage.removeItem('balance_start_0');

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });

      toast.success("All data cleared successfully", {
        description: "Your account has been reset to zero balance and zero transactions"
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error("Failed to clear data");
    }
  };

  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const renderProfileSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Profile Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profileLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted animate-pulse rounded"></div>
              <div className="h-10 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first-name">First Name</Label>
                <Input 
                  id="first-name" 
                  defaultValue={profile?.first_name || ""} 
                  placeholder="Enter your first name"
                  onBlur={(e) => handleProfileChange('first_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="last-name">Last Name</Label>
                <Input 
                  id="last-name" 
                  defaultValue={profile?.last_name || ""} 
                  placeholder="Enter your last name"
                  onBlur={(e) => handleProfileChange('last_name', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={profile?.email || user?.email || ""} 
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input 
                id="company" 
                defaultValue={profile?.company || ""} 
                placeholder="Enter your company name"
                onBlur={(e) => handleProfileChange('company', e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAppearanceSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>Appearance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Theme</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose how the dashboard appears to you
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="justify-start"
            >
              {getThemeIcon('light')}
              <span className="ml-2">Light</span>
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="justify-start"
            >
              {getThemeIcon('dark')}
              <span className="ml-2">Dark</span>
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
              className="justify-start"
            >
              {getThemeIcon('system')}
              <span className="ml-2">System</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFinancialSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Financial Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-currency">Default Currency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger id="default-currency" className="bg-background">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
              <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
              <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
              <SelectItem value="CAD">CAD - Canadian Dollar (C$)</SelectItem>
              <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
              <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
              <SelectItem value="CNY">CNY - Chinese Yuan (¥)</SelectItem>
              <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
              <SelectItem value="MXN">MXN - Mexican Peso ($)</SelectItem>
              <SelectItem value="BRL">BRL - Brazilian Real (R$)</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => updateProfileMutation.mutate({ currency: selectedCurrency })}
            disabled={updateProfileMutation.isPending || selectedCurrency === profile?.currency}
            className="w-full mt-2"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Currency'}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="auto-categorize" />
          <Label htmlFor="auto-categorize">Auto-categorize transactions</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="smart-forecasting" defaultChecked />
          <Label htmlFor="smart-forecasting">Enable smart cash flow forecasting</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="auto-sync-cash" defaultChecked />
          <Label htmlFor="auto-sync-cash">Automatically sync cash balance with bank accounts</Label>
        </div>
      </CardContent>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Payment Reminders</p>
            <p className="text-sm text-muted-foreground">Get notified about upcoming vendor payments</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Cash Flow Alerts</p>
            <p className="text-sm text-muted-foreground">Alerts when cash flow goes below threshold</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Weekly Reports</p>
            <p className="text-sm text-muted-foreground">Receive weekly financial summaries</p>
          </div>
          <Switch />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Amazon Payout Notifications</p>
            <p className="text-sm text-muted-foreground">Get notified when Amazon payouts are received</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );

  const renderDataExportSettings = () => {
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

  const renderSecuritySettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Security</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" className="w-full">
          Change Password
        </Button>
        <Button variant="outline" size="sm" className="w-full">
          Two-Factor Auth
        </Button>
        <Separator />
        <Button variant="destructive" size="sm" className="w-full">
          Delete Account
        </Button>
        
        <div className="mt-6">
          <h4 className="font-medium mb-3">Connected Services</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Amazon Seller Central</span>
              <Badge variant="secondary" className="text-xs">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Chase Bank</span>
              <Badge variant="secondary" className="text-xs">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">American Express</span>
              <Badge variant="outline" className="text-xs">Disconnected</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Manage Connections
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDataManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Data Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive mb-1">Danger Zone</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Clear all your financial data including vendors, income, and transactions. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p className="mb-2">This will permanently delete all of your:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 mb-3">
                          <li>Vendor purchase orders</li>
                          <li>Income transactions</li>
                          <li>Transaction history</li>
                        </ul>
                        <p>This action cannot be undone and you will start from zero.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Clear All Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'bank-accounts':
        return <BankAccountManagement />;
      case 'vendors':
        return <VendorManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'recurring-expenses':
        return <RecurringExpenseManagement />;
      case 'amazon':
        return <AmazonManagement />;
      case 'credit-cards':
        return <CreditCardManagement />;
      case 'appearance':
        return renderAppearanceSettings();
      case 'financial':
        return renderFinancialSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'export':
        return renderDataExportSettings();
      case 'security':
        return renderSecuritySettings();
      case 'data-management':
        return renderDataManagement();
      case 'feature-request':
        return <FeatureRequest />;
      default:
        return renderProfileSettings();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <PageLoadingWrapper isLoading={profileLoading} loadingMessage="Loading your settings...">
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <SettingsIcon className="h-6 w-6" />
                  <span>Settings</span>
                </h1>
                <p className="text-muted-foreground">
                  Manage your account and application preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SidebarNavigation 
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
      </div>
    </PageLoadingWrapper>
  );
};

export default Settings;