import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Database,
  ArrowLeft,
  Save,
  Download,
  FileText,
  Sun,
  Moon,
  Monitor,
  Palette,
  ShoppingBag,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { PurchaseAddonsModal } from "@/components/cash-flow/purchase-addons-modal";
import { AddAccountModal } from "@/components/cash-flow/add-account-modal";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPurchaseAddonsModal, setShowPurchaseAddonsModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return null;
  };

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
            <Button className="bg-gradient-primary">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" defaultValue="Andy" />
                  </div>
                  <div>
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" defaultValue="Johnson" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="andy@example.com" />
                </div>
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" defaultValue="Andy's Amazon Business" />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
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

            {/* Financial Settings */}
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
              </CardContent>
            </Card>

            {/* Notification Settings */}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status & Billing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Account & Billing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan</span>
                  <Badge className="bg-gradient-primary">Starter - $29/mo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Used</span>
                  <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bank Connections</span>
                  <span className="text-sm text-muted-foreground">1 of 2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Amazon Connections</span>
                  <span className="text-sm text-muted-foreground">0 of 1</span>
                </div>
                <Separator />
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Upgrade Plan
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary"
                    onClick={() => setShowPurchaseAddonsModal(true)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Purchase Add-ons
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAddAccountModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Export & Security */}
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

            {/* Security */}
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
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <PurchaseAddonsModal
        open={showPurchaseAddonsModal}
        onOpenChange={setShowPurchaseAddonsModal}
      />
      
      <AddAccountModal
        open={showAddAccountModal}
        onOpenChange={setShowAddAccountModal}
      />
    </div>
  );
};

export default Settings;