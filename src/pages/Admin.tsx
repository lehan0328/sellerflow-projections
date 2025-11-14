import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  LayoutDashboard,
  Tag
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
import { AdminCodeTracking } from "@/components/admin/AdminCodeTracking";

const Admin = () => {
  const { isAdmin, userRole } = useAdmin();
  const [searchParams] = useSearchParams();
  
  const tabSections = useMemo(() => {
    const allSections = [
      {
        title: "Overview",
        tabs: [
          { value: "overview", label: "Dashboard", icon: LayoutDashboard, rolesAllowed: ['admin'] },
          { value: "staff-directory", label: "Staff Directory", icon: UserCog, rolesAllowed: ['admin'] },
          { value: "plan-override", label: "Plan Management", icon: Settings, rolesAllowed: ['admin'] },
        ],
        rolesAllowed: ['admin'] // Admin only
      },
      {
        title: "Key Business Metrics",
        tabs: [
          { value: "signups", label: "Signup Analytics", icon: UserPlus, rolesAllowed: ['admin'] },
          { value: "customers", label: "Customers", icon: Users, rolesAllowed: ['admin'] },
          { value: "subscriptions", label: "Subscriptions", icon: CreditCard, rolesAllowed: ['admin'] },
          { value: "code-tracking", label: "Code Tracking", icon: Tag, rolesAllowed: ['admin'] },
          { value: "send-update", label: "Send Update", icon: Megaphone, rolesAllowed: ['admin'] },
          { value: "support-dashboard", label: "Support Dashboard", icon: MessageSquare, rolesAllowed: ['admin'] },
          { value: "forecast-accuracy", label: "Forecast Accuracy", icon: Target, rolesAllowed: ['admin'] },
        ],
        rolesAllowed: ['admin'] // Only admin can access
      },
      {
        title: "Support & Features",
        tabs: [
          { value: "support", label: "Support Tickets", icon: LifeBuoy, rolesAllowed: ['admin', 'staff'] },
          { value: "features", label: "Feature Requests", icon: MessageSquare, rolesAllowed: ['admin', 'staff'] },
          { value: "referrals", label: "Referrals", icon: Gift, rolesAllowed: ['admin', 'staff'] },
          { value: "affiliates", label: "Affiliates", icon: UserCog, rolesAllowed: ['admin', 'staff'] },
        ],
        rolesAllowed: ['admin', 'staff'] // Both admin and staff can access
      }
    ];

    // Filter sections based on user role
    // Only hardcoded website admins OR users with 'admin' role see everything
    // Staff users only see sections where their role is explicitly allowed
    const filtered = allSections.filter(section => {
      if (!userRole) return false; // No role = no access
      
      // Staff can only see sections that explicitly allow 'staff'
      if (userRole === 'staff') {
        return section.rolesAllowed.includes('staff');
      }
      
      // Admin role sees everything
      return true;
    });
    
    return filtered;
  }, [isAdmin, userRole]);

  // Set default active tab based on user role
  const defaultTab = useMemo(() => {
    // Staff users default to support tickets
    if (userRole === 'staff') {
      return 'support';
    }
    // Admin users default to dashboard overview
    return 'overview';
  }, [userRole]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync activeTab with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Redirect staff users to support section if they try to access admin tabs
  useEffect(() => {
    if (userRole === 'staff') {
      // Get all allowed tab values for staff
      const staffAllowedTabs = tabSections
        .flatMap(section => section.tabs)
        .filter(tab => tab.rolesAllowed?.includes('staff'))
        .map(tab => tab.value);

      // If current tab is not allowed for staff, redirect to support
      if (!staffAllowedTabs.includes(activeTab)) {
        setActiveTab('support');
      }
    }
  }, [userRole, activeTab, tabSections]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-4">
          {/* Sidebar Navigation */}
          <div className="w-56 flex-shrink-0">
            <div className="sticky top-6 space-y-3 p-2 rounded-lg border bg-card">
              {tabSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  <h3 className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-0.5">
                    {section.tabs
                      .filter(tab => {
                        // Filter individual tabs based on user role
                        if (!tab.rolesAllowed) return true; // No restriction
                        if (userRole === 'staff') return tab.rolesAllowed.includes('staff');
                        return true; // Admin sees all
                      })
                      .map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;
                        
                        return (
                          <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
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

            <TabsContent value="code-tracking" className="m-0">
              <AdminCodeTracking />
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
