import { useState, useMemo } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAdmin } from "@/hooks/useAdmin";
import { 
  Users, 
  LifeBuoy, 
  CreditCard,
  Gift,
  MessageSquare,
  UserCog,
  Target,
  Settings,
  UserPlus,
  Megaphone,
  LayoutDashboard
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
import { AdminSendUpdate } from "@/components/admin/AdminSendUpdate";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminStaffDirectory } from "@/components/admin/AdminStaffDirectory";

const Admin = () => {
  const { isAdmin, userRole } = useAdmin();
  
  console.log('[ADMIN] User permissions:', { isAdmin, userRole });
  
  const tabSections = useMemo(() => {
    const allSections = [
      {
        title: "Overview",
        tabs: [
          { value: "overview", label: "Dashboard", icon: LayoutDashboard },
        ],
        rolesAllowed: ['admin', 'staff'] // Both can see overview
      },
      {
        title: "Business Management",
        tabs: [
          { value: "staff-directory", label: "Staff Directory", icon: UserCog },
          { value: "signups", label: "Signup Analytics", icon: UserPlus },
          { value: "customers", label: "Customers", icon: Users },
          { value: "subscriptions", label: "Subscriptions", icon: CreditCard },
          { value: "send-update", label: "Send Update", icon: Megaphone },
          { value: "support-dashboard", label: "Support Dashboard", icon: MessageSquare },
          { value: "forecast-accuracy", label: "Forecast Accuracy", icon: Target },
        ],
        rolesAllowed: ['admin'] // Only admin can access
      },
      {
        title: "Support & Features",
        tabs: [
          { value: "support", label: "Support Tickets", icon: LifeBuoy },
          { value: "features", label: "Feature Requests", icon: MessageSquare },
          { value: "referrals", label: "Referrals", icon: Gift },
          { value: "affiliates", label: "Affiliates", icon: UserCog },
        ],
        rolesAllowed: ['admin', 'staff'] // Both admin and staff can access
      },
      {
        title: "System",
        tabs: [
          { value: "plan-override", label: "Plan Management", icon: Settings },
        ],
        rolesAllowed: ['admin'] // Only admin can access
      }
    ];

    // Filter sections based on user role
    // Website admins (isAdmin=true) see everything regardless of userRole
    const filtered = allSections.filter(section => {
      if (isAdmin) return true; // Website admins see all sections
      if (!userRole) return false; // No role = no access
      return section.rolesAllowed.includes(userRole);
    });
    
    console.log('[ADMIN] Filtered sections:', { 
      isAdmin, 
      userRole, 
      totalSections: allSections.length, 
      filteredSections: filtered.length,
      sectionTitles: filtered.map(s => s.title)
    });
    
    return filtered;
  }, [isAdmin, userRole]);

  // Set default active tab based on user role
  const defaultTab = useMemo(() => {
    return 'overview'; // Everyone defaults to Dashboard Overview
  }, [isAdmin, userRole]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-4">
          {/* Sidebar Navigation */}
          <div className="w-52 flex-shrink-0">
            <div className="sticky top-6 space-y-4 p-2 rounded-lg border bg-card">
              {tabSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.tabs.map((tab) => {
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
                  {sectionIndex < tabSections.length - 1 && (
                    <div className="h-px bg-border my-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <TabsContent value="overview" className="m-0">
              <AdminDashboardOverview />
            </TabsContent>

            <TabsContent value="staff-directory" className="m-0">
              <AdminStaffDirectory />
            </TabsContent>

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

            <TabsContent value="send-update" className="m-0">
              <AdminSendUpdate />
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
  );
};

export default Admin;
