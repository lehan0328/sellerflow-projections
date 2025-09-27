import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarNavigation } from "@/components/settings/sidebar-navigation";
import { CreditCardManagement } from "@/components/settings/credit-card-management";
import { VendorManagement } from "@/components/settings/vendor-management";
import { AmazonManagement } from "@/components/settings/amazon-management";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const queryClient = useQueryClient();

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
    mutationFn: async (profileData: { first_name?: string; last_name?: string; company?: string }) => {
      if (!user?.id) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div>
          <Label htmlFor="default-currency">Default Currency</Label>
          <Input id="default-currency" value="USD" disabled />
        </div>
        <div>
          <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
          <Input id="fiscal-year" type="month" defaultValue="2024-01" />
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

  const renderDataExportSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Data Export</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => handleExport('Cash Flow')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Cash Flow (CSV)
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => handleExport('Vendors')}
        >
          <Database className="mr-2 h-4 w-4" />
          Export Vendor Data (CSV)
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => handleExport('Transactions')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Transactions (PDF)
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => handleExport('All Data')}
        >
          <Download className="mr-2 h-4 w-4" />
          Export All Data (ZIP)
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Exports include data from the last 12 months
        </p>
      </CardContent>
    </Card>
  );

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

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'vendors':
        return <VendorManagement />;
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
      default:
        return renderProfileSettings();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
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
  );
};

export default Settings;