import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExcludeTodayProvider } from "@/contexts/ExcludeTodayContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import { WelcomeAnimationWrapper } from "./components/WelcomeAnimationWrapper";
import { SignUpsClosed } from "./pages/SignUpsClosed";
import { SignUp } from "./pages/SignUp";
import UpgradePlan from "./pages/UpgradePlan";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import TransactionLog from "./pages/TransactionLog";
import BankTransactions from "./pages/BankTransactions";
import Analytics from "./pages/Analytics";
import ScenarioPlanner from "./pages/ScenarioPlanner";
import AmazonForecast from "./pages/AmazonForecast";
import ScheduleDemo from "./pages/ScheduleDemo";
import OAuthRedirect from "./pages/OAuthRedirect";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import FeatureDetail from "./pages/FeatureDetail";
import Docs from "./pages/Docs";
import DocsGettingStarted from "./pages/DocsGettingStarted";
import DocsAmazonIntegration from "./pages/DocsAmazonIntegration";
import DocsFAQ from "./pages/DocsFAQ";
import Guides from "./pages/Guides";
import GuidesPurchaseOrders from "./pages/GuidesPurchaseOrders";
import GuidesAiPOAutofill from "./pages/GuidesAiPOAutofill";
import GuidesAddingIncome from "./pages/GuidesAddingIncome";
import GuidesAddRecurringIncome from "./pages/GuidesAddRecurringIncome";
import GuidesAddRecurringExpense from "./pages/GuidesAddRecurringExpense";
import GuidesEditingTransactions from "./pages/GuidesEditingTransactions";
import GuidesPartialPayment from "./pages/GuidesPartialPayment";
import GuidesEarlyPaymentReceived from "./pages/GuidesEarlyPaymentReceived";
import GuidesSearchByAmount from "./pages/GuidesSearchByAmount";
import GuidesSearchByDate from "./pages/GuidesSearchByDate";
import GuidesPayoutForecasting from "./pages/GuidesPayoutForecasting";
import GuidesAdvancedPOPlanning from "./pages/GuidesAdvancedPOPlanning";
import GuidesScenarioPlanning from "./pages/GuidesScenarioPlanning";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { Auth } from "./pages/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PlanProtectedRoute } from "./components/PlanProtectedRoute";
import Admin from "./pages/Admin";
import AdminAuth from "./pages/AdminAuth";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { AdminLayout } from "./components/AdminLayout";
import { PaymentAccessControl } from "./components/PaymentAccessControl";
import PaymentRequired from "./pages/PaymentRequired";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import Onboarding from "./pages/Onboarding";
import DocumentStorage from "./pages/DocumentStorage";
import Blog from "./pages/Blog";
import PredictAmazonPayouts from "./pages/blog/PredictAmazonPayouts";
import SellerFundingForecast from "./pages/blog/SellerFundingForecast";
import ScalingToSevenFigures from "./pages/blog/ScalingToSevenFigures";
import BestCashflowTools from "./pages/blog/BestCashflowTools";
import InventoryTurnoverCashflow from "./pages/blog/InventoryTurnoverCashflow";
import ForecastAmazonPayouts from "./pages/blog/ForecastAmazonPayouts";
import ManageCashflow from "./pages/blog/ManageCashflow";
import FinancingGrowth from "./pages/blog/FinancingGrowth";
import BlogTag from "./pages/BlogTag";
import Partners from "./pages/Partners";
import ReferralDashboard from "./pages/ReferralDashboard";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import Pricing from "./pages/Pricing";
import FlexReport from "./pages/FlexReport";
import AmazonOAuthCallback from "./pages/AmazonOAuthCallback";
import SampleDataGenerator from "./pages/SampleDataGenerator";
import MatchTransactions from "./pages/MatchTransactions";
import Notifications from "./pages/Notifications";
import Inventory from "./pages/Inventory";
import Reimbursements from "./pages/Reimbursements";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import Accounting from "./pages/Accounting";
import Platforms from "./pages/Platforms";
import DebugProjections from "./pages/DebugProjections";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000,   // 10 minutes - cached data lifetime (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnMount: false, // Use cache if available
      retry: 1, // Only retry once on failure
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ExcludeTodayProvider>
        <TooltipProvider>
          <Sonner />
          <PaymentAccessControl>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/features/:slug" element={<FeatureDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/signups-closed" element={<SignUpsClosed />} />
            <Route path="/payment-required" element={<PaymentRequired />} />
            <Route path="/contact" element={<Contact />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/getting-started" element={<DocsGettingStarted />} />
          <Route path="/docs/amazon-integration" element={<DocsAmazonIntegration />} />
          <Route path="/docs/faq" element={<DocsFAQ />} />
          <Route path="/guides/purchase-orders" element={
            <ProtectedRoute>
              <GuidesPurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/guides/ai-po-autofill" element={
            <ProtectedRoute>
              <GuidesAiPOAutofill />
            </ProtectedRoute>
          } />
          <Route path="/guides/adding-income" element={
            <ProtectedRoute>
              <GuidesAddingIncome />
            </ProtectedRoute>
          } />
          <Route path="/guides/add-recurring-income" element={
            <ProtectedRoute>
              <GuidesAddRecurringIncome />
            </ProtectedRoute>
          } />
          <Route path="/guides/add-recurring-expense" element={
            <ProtectedRoute>
              <GuidesAddRecurringExpense />
            </ProtectedRoute>
          } />
          <Route path="/guides/editing-transactions" element={
            <ProtectedRoute>
              <GuidesEditingTransactions />
            </ProtectedRoute>
          } />
          <Route path="/guides/partial-payment" element={
            <ProtectedRoute>
              <GuidesPartialPayment />
            </ProtectedRoute>
          } />
          <Route path="/guides/early-payment-received" element={
            <ProtectedRoute>
              <GuidesEarlyPaymentReceived />
            </ProtectedRoute>
          } />
            <Route path="/guides/payout-forecasting" element={
              <ProtectedRoute>
                <GuidesPayoutForecasting />
              </ProtectedRoute>
            } />
            <Route path="/guides/advanced-po-planning" element={
              <ProtectedRoute>
                <GuidesAdvancedPOPlanning />
              </ProtectedRoute>
            } />
            <Route path="/guides/scenario-planning" element={
              <ProtectedRoute>
                <GuidesScenarioPlanning />
              </ProtectedRoute>
            } />
            <Route path="/guides/search-by-amount" element={
            <ProtectedRoute>
              <GuidesSearchByAmount />
            </ProtectedRoute>
          } />
          <Route path="/guides/search-by-date" element={
            <ProtectedRoute>
              <GuidesSearchByDate />
            </ProtectedRoute>
          } />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/predict-amazon-payouts" element={<PredictAmazonPayouts />} />
          <Route path="/blog/seller-funding-forecast" element={<SellerFundingForecast />} />
          <Route path="/blog/scaling-to-seven-figures" element={<ScalingToSevenFigures />} />
          <Route path="/blog/best-cashflow-tools" element={<BestCashflowTools />} />
          <Route path="/blog/inventory-turnover-cashflow" element={<InventoryTurnoverCashflow />} />
          <Route path="/blog/forecast-amazon-payouts" element={<ForecastAmazonPayouts />} />
          <Route path="/blog/manage-cashflow" element={<ManageCashflow />} />
          <Route path="/blog/financing-growth" element={<FinancingGrowth />} />
          <Route path="/blog/tag/:tag" element={<BlogTag />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reimbursements" element={<Reimbursements />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/platforms" element={<Platforms />} />
          <Route path="/admin/login" element={<AdminAuth />} />
          <Route path="/admin/dashboard" element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <Admin />
              </AdminLayout>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <Admin />
              </AdminLayout>
            </ProtectedAdminRoute>
          } />
          <Route path="/referral-dashboard" element={
            <ProtectedRoute>
              <ReferralDashboard />
            </ProtectedRoute>
          } />
          <Route path="/affiliate-dashboard" element={
            <ProtectedRoute>
              <AffiliateDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <WelcomeAnimationWrapper />
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/sample-data" element={
            <ProtectedRoute>
              <SampleDataGenerator />
            </ProtectedRoute>
          } />
          <Route path="/upgrade-plan" element={
            <ProtectedRoute>
              <UpgradePlan />
            </ProtectedRoute>
          } />
          <Route path="/subscription" element={
            <ProtectedRoute>
              <SubscriptionManagement />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <TransactionLog />
            </ProtectedRoute>
          } />
          <Route path="/bank-transactions" element={
            <ProtectedRoute>
              <BankTransactions />
            </ProtectedRoute>
          } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/scenario-planner" element={
              <ProtectedRoute>
                <PlanProtectedRoute minimumPlan="professional">
                  <ScenarioPlanner />
                </PlanProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/ai-forecast" element={
              <ProtectedRoute>
                <AmazonForecast />
              </ProtectedRoute>
            } />
            <Route path="/schedule-demo" element={
              <ProtectedRoute>
                <ScheduleDemo />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            } />
            <Route path="/document-storage" element={
              <ProtectedRoute>
                <PlanProtectedRoute minimumPlan="growing">
                  <DocumentStorage />
                </PlanProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/flex-report" element={
              <ProtectedRoute>
                <FlexReport />
              </ProtectedRoute>
            } />
          <Route path="/debug-projections" element={
            <ProtectedRoute>
              <DebugProjections />
            </ProtectedRoute>
          } />
          <Route path="/amazon-oauth-callback" element={<AmazonOAuthCallback />} />
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PaymentAccessControl>
      </TooltipProvider>
      </ExcludeTodayProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
