import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  LifeBuoy, 
  CreditCard, 
  Settings,
  ArrowLeft,
  Shield
} from "lucide-react";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminSupportTickets } from "@/components/admin/AdminSupportTickets";
import { AdminSubscriptions } from "@/components/admin/AdminSubscriptions";

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
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
