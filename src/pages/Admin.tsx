import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  LifeBuoy, 
  CreditCard, 
  ArrowLeft,
  Shield,
  Gift,
  MessageSquare,
  UserCog,
  Target,
  Settings,
  UserPlus
} from "lucide-react";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminSupportTickets } from "@/components/admin/AdminSupportTickets";
import { AdminSubscriptions } from "@/components/admin/AdminSubscriptions";
import AdminReferrals from "@/components/admin/AdminReferrals";
import AdminAffiliates from "@/components/admin/AdminAffiliates";
import { AdminFeatureRequests } from "@/components/admin/AdminFeatureRequests";
import { AdminForecastAccuracy } from "@/components/admin/AdminForecastAccuracy";
import { SetPlanOverride } from "@/components/admin/SetPlanOverride";
import { AdminSupportDashboard } from "@/components/admin/AdminSupportDashboard";
import { AdminSignupDashboard } from "@/components/admin/AdminSignupDashboard";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("signups");

  const tabs = [
    { value: "signups", label: "Signup Analytics", icon: UserPlus },
    { value: "customers", label: "Customers", icon: Users },
    { value: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { value: "support-dashboard", label: "Support Dashboard", icon: MessageSquare },
    { value: "support", label: "Support Tickets", icon: LifeBuoy },
    { value: "referrals", label: "Referrals", icon: Gift },
    { value: "affiliates", label: "Affiliates", icon: UserCog },
    { value: "features", label: "Feature Requests", icon: MessageSquare },
    { value: "forecast-accuracy", label: "Forecast Accuracy", icon: Target },
    { value: "plan-override", label: "Plan Management", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-4">
          {/* Sidebar Navigation */}
          <div className="w-52 flex-shrink-0">
            <div className="sticky top-6 space-y-1 p-2 rounded-lg border bg-card">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-left">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <TabsContent value="signups" className="m-0">
              <AdminSignupDashboard />
            </TabsContent>

            <TabsContent value="customers" className="m-0">
              <AdminCustomers />
            </TabsContent>

            <TabsContent value="support-dashboard" className="m-0">
              <AdminSupportDashboard />
            </TabsContent>

            <TabsContent value="support" className="m-0">
              <AdminSupportTickets />
            </TabsContent>

            <TabsContent value="subscriptions" className="m-0">
              <AdminSubscriptions />
            </TabsContent>

            <TabsContent value="referrals" className="m-0">
              <AdminReferrals />
            </TabsContent>

            <TabsContent value="affiliates" className="m-0">
              <AdminAffiliates />
            </TabsContent>

            <TabsContent value="features" className="m-0">
              <AdminFeatureRequests />
            </TabsContent>

            <TabsContent value="forecast-accuracy" className="m-0">
              <AdminForecastAccuracy />
            </TabsContent>

            <TabsContent value="plan-override" className="m-0">
              <SetPlanOverride />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
