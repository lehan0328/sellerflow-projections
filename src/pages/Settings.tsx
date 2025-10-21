import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  ArrowLeft,
  FileText,
  Sun,
  Moon,
  Monitor,
  Palette,
  Database,
  Trash2,
  AlertTriangle,
  Users,
  ShoppingCart
} from "lucide-react";
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
import { TeamManagement } from "@/components/settings/team-management";
import { BankAccountManagement } from "@/components/settings/bank-account-management";
import { CustomerManagement } from "@/components/settings/customer-management";
import { RecurringExpenseManagement } from "@/components/settings/recurring-expense-management";
import { DataExport } from "@/components/settings/data-export";
import { CategoryManagement } from "@/components/settings/category-management";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageLoadingWrapper } from "@/components/PageLoadingWrapper";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAdmin } from "@/hooks/useAdmin";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [clearDataConfirmation, setClearDataConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const { resetAccount } = useUserSettings();
  const { isAdmin, isAccountAdmin, isLoading: adminLoading } = useAdmin();
  const [companyName, setCompanyName] = useState('');

  // Check if user is website admin
  const { data: isWebsiteAdmin = false } = useQuery({
    queryKey: ['is-website-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_website_admin');
      if (error) {
        console.error('Error checking website admin status:', error);
        return false;
      }
      return data || false;
    },
    enabled: !!user?.id,
  });

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
    console.log('[Settings] Profile data loaded:', profile);
    if (profile?.currency) {
      setSelectedCurrency(profile.currency);
    }
    if (profile?.company) {
      setCompanyName(profile.company);
    } else {
      console.log('[Settings] No company field in profile');
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

  // Handle addon purchase success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const addonSuccess = params.get('addon_success');
    const sessionId = params.get('session_id');
    
    if (addonSuccess === 'true' && sessionId) {
      // Record the addon purchase
      const recordPurchase = async () => {
        try {
          const { error } = await supabase.functions.invoke('record-addon-purchase', {
            body: { session_id: sessionId }
          });
          
          if (error) throw error;
          
          toast.success('Add-on purchased successfully! Your limit has been increased.');
          
          // Refresh addons and plan limits
          queryClient.invalidateQueries({ queryKey: ['purchased-addons'] });
          queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
          
          // Clean up URL
          const cleanUrl = window.location.pathname + window.location.search.split('&').filter(param => 
            !param.includes('addon_success') && !param.includes('session_id')
          ).join('&');
          window.history.replaceState({}, '', cleanUrl || window.location.pathname);
        } catch (error) {
          console.error('Error recording addon purchase:', error);
          toast.error('Failed to record purchase. Please contact support.');
        }
      };
      
      recordPurchase();
    } else if (params.get('addon_canceled') === 'true') {
      toast.info('Add-on purchase was canceled');
      
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [location.search, queryClient]);

  const handleProfileChange = (field: string, value: string) => {
    // Trim and validate input
    const trimmedValue = value.trim();
    
    // Validate max length
    if (trimmedValue.length > 255) {
      toast.error('Value is too long (max 255 characters)');
      return;
    }
    
    console.log('[Settings] Saving profile field:', field, 'Value:', trimmedValue);
    
    const profileData = {
      [field]: trimmedValue,
    };
    updateProfileMutation.mutate(profileData);
  };

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} data...`);
    // Here you would implement the actual export functionality
  };

  const handleClearAllData = async () => {
    console.log('🗑️ Settings page - calling resetAccount');
    await resetAccount();
    // Note: resetAccount already handles page reload, no need to invalidate queries
  };

  const handleRestoreAdminAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('restore-admin-access');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Admin access restored successfully! Refreshing...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data?.error || "Failed to restore admin access");
      }
    } catch (error) {
      console.error("Error restoring admin access:", error);
      toast.error(error instanceof Error ? error.message : "Failed to restore admin access");
    }
  };

  const handleGenerateAdminTestData = async () => {
    try {
      toast.loading("Generating admin test data...");
      const { data, error } = await supabase.functions.invoke('generate-admin-test-data');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Created ${data.data.users_created} users, ${data.data.support_tickets} tickets, ${data.data.referral_codes} referral codes`);
      } else {
        throw new Error(data?.error || "Failed to generate test data");
      }
    } catch (error) {
      console.error("Error generating test data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate test data");
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
                value={user?.email || ""} 
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
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed !== profile?.company) {
                    handleProfileChange('company', trimmed);
                  }
                }}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Changes are saved automatically when you click away.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-currency">Default Currency</Label>
              <Select 
                value={selectedCurrency} 
                onValueChange={(value) => {
                  setSelectedCurrency(value);
                  updateProfileMutation.mutate({ currency: value });
                }}
              >
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

  const renderDataExportSettings = () => <DataExport />;


  const renderDataManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Data Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isWebsiteAdmin && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Restore Admin Access</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  If you lost admin access after clearing data, use this to restore your admin and owner roles.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRestoreAdminAccess}
                  className="border-blue-300 dark:border-blue-700"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Restore Admin Access
                </Button>
              </div>
            </div>
          </div>
        )}
        {isWebsiteAdmin && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Database className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Generate Admin Test Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Create sample users, support tickets, and referrals for testing the admin dashboard. This data persists after clearing your own account.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateAdminTestData}
                  className="border-green-300 dark:border-green-700"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Generate Test Data
                </Button>
              </div>
            </div>
          </div>
        )}
        {isWebsiteAdmin && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Generate Sample Amazon Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a sample Amazon account with 6 months of historical payouts and transactions for testing forecasts and insights.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/sample-data')}
                  className="border-blue-300 dark:border-blue-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Generate Amazon Data
                </Button>
              </div>
            </div>
          </div>
        )}
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
                    <AlertDialogTitle>⚠️ Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p className="text-destructive font-semibold">This action cannot be undone!</p>
                        <div>
                          <p className="mb-2">This will permanently delete all of your:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1 mb-3">
                            <li>Vendor purchase orders</li>
                            <li>Income transactions</li>
                            <li>Transaction history</li>
                            <li>All financial data</li>
                          </ul>
                          <p className="font-semibold">You will start from zero balance with no records.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="confirm-clear"
                            checked={clearDataConfirmation}
                            onCheckedChange={(checked) => setClearDataConfirmation(checked === true)}
                          />
                          <Label
                            htmlFor="confirm-clear"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            I understand this action cannot be undone and will delete all my data
                          </Label>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setClearDataConfirmation(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleClearAllData();
                        setClearDataConfirmation(false);
                      }}
                      disabled={!clearDataConfirmation}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
    // Admin-only sections
    const adminOnlySections = [
      'team',
      'bank-accounts',
      'credit-cards',
      'vendors',
      'customers',
      'recurring-expenses',
      'categories',
      'amazon',
      'invoices',
      'export',
      'data-management'
    ];

    // If user is staff and trying to access admin-only section, show access denied
    if (!isAccountAdmin && adminOnlySections.includes(activeSection)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <Shield className="h-5 w-5" />
              <span>Access Restricted</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section is only accessible to account owners and administrators. 
              Please contact your account administrator for access.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'team':
        return <TeamManagement />;
      case 'bank-accounts':
        return <BankAccountManagement />;
      case 'vendors':
        return <VendorManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'recurring-expenses':
        return <RecurringExpenseManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'amazon':
        return <AmazonManagement />;
      case 'credit-cards':
        return <CreditCardManagement />;
      case 'appearance':
        return renderAppearanceSettings();
      case 'export':
        return renderDataExportSettings();
      case 'data-management':
        return renderDataManagement();
      default:
        return renderProfileSettings();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <PageLoadingWrapper isLoading={profileLoading || adminLoading} loadingMessage="Loading your settings...">
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
                  isAdmin={isAccountAdmin}
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