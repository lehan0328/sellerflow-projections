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
  Database,
  ArrowLeft,
  Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

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
                    <Input id="first-name" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john.doe@example.com" />
                </div>
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" placeholder="Your Company LLC" />
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
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Account Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan</span>
                  <Badge className="bg-gradient-primary">Pro</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Used</span>
                  <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connected Accounts</span>
                  <span className="text-sm text-muted-foreground">3 of 5</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>

            {/* Data & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Data & Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" size="sm" className="w-full">
                  Export Data
                </Button>
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
    </div>
  );
};

export default Settings;