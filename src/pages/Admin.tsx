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
  Settings
} from "lucide-react";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminSupportTickets } from "@/components/admin/AdminSupportTickets";
import { AdminSubscriptions } from "@/components/admin/AdminSubscriptions";
import AdminReferrals from "@/components/admin/AdminReferrals";
import AdminAffiliates from "@/components/admin/AdminAffiliates";
import { AdminFeatureRequests } from "@/components/admin/AdminFeatureRequests";
import { AdminForecastAccuracy } from "@/components/admin/AdminForecastAccuracy";
import { SetPlanOverride } from "@/components/admin/SetPlanOverride";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("customers");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 max-w-7xl">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Affiliates
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="forecast-accuracy" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Accuracy
            </TabsTrigger>
            <TabsTrigger value="plan-override" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-6">
            <AdminCustomers />
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <AdminSupportTickets />
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <AdminSubscriptions />
          </TabsContent>

          <TabsContent value="referrals" className="mt-6">
            <AdminReferrals />
          </TabsContent>

          <TabsContent value="affiliates" className="mt-6">
            <AdminAffiliates />
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <AdminFeatureRequests />
          </TabsContent>

          <TabsContent value="forecast-accuracy" className="mt-6">
            <AdminForecastAccuracy />
          </TabsContent>

          <TabsContent value="plan-override" className="mt-6">
            <SetPlanOverride />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
