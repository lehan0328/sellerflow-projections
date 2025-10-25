import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExcludeTodayProvider } from "@/contexts/ExcludeTodayContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PlanProtectedRoute } from "./components/PlanProtectedRoute";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { PaymentAccessControl } from "./components/PaymentAccessControl";
import { LoadingScreen } from "./components/LoadingScreen";

// Lazy load all pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const SignUpsClosed = lazy(() => import("./pages/SignUpsClosed").then(m => ({ default: m.SignUpsClosed })));
const SignUp = lazy(() => import("./pages/SignUp").then(m => ({ default: m.SignUp })));
const UpgradePlan = lazy(() => import("./pages/UpgradePlan"));
const SubscriptionManagement = lazy(() => import("./pages/SubscriptionManagement"));
const TransactionLog = lazy(() => import("./pages/TransactionLog"));
const BankTransactions = lazy(() => import("./pages/BankTransactions"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ScenarioPlanner = lazy(() => import("./pages/ScenarioPlanner"));
const AmazonForecast = lazy(() => import("./pages/AmazonForecast"));
const ScheduleDemo = lazy(() => import("./pages/ScheduleDemo"));
const OAuthRedirect = lazy(() => import("./pages/OAuthRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Features = lazy(() => import("./pages/Features"));
const FeatureDetail = lazy(() => import("./pages/FeatureDetail"));
const Docs = lazy(() => import("./pages/Docs"));
const DocsGettingStarted = lazy(() => import("./pages/DocsGettingStarted"));
const DocsAmazonIntegration = lazy(() => import("./pages/DocsAmazonIntegration"));
const DocsFAQ = lazy(() => import("./pages/DocsFAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Auth = lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));
const Admin = lazy(() => import("./pages/Admin"));
const PaymentRequired = lazy(() => import("./pages/PaymentRequired"));
const Support = lazy(() => import("./pages/Support"));
const Contact = lazy(() => import("./pages/Contact"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DocumentStorage = lazy(() => import("./pages/DocumentStorage"));
const Blog = lazy(() => import("./pages/Blog"));
const PredictAmazonPayouts = lazy(() => import("./pages/blog/PredictAmazonPayouts"));
const SellerFundingForecast = lazy(() => import("./pages/blog/SellerFundingForecast"));
const ScalingToSevenFigures = lazy(() => import("./pages/blog/ScalingToSevenFigures"));
const BestCashflowTools = lazy(() => import("./pages/blog/BestCashflowTools"));
const InventoryTurnoverCashflow = lazy(() => import("./pages/blog/InventoryTurnoverCashflow"));
const ForecastAmazonPayouts = lazy(() => import("./pages/blog/ForecastAmazonPayouts"));
const ManageCashflow = lazy(() => import("./pages/blog/ManageCashflow"));
const FinancingGrowth = lazy(() => import("./pages/blog/FinancingGrowth"));
const BlogTag = lazy(() => import("./pages/BlogTag"));
const Partners = lazy(() => import("./pages/Partners"));
const ReferralDashboard = lazy(() => import("./pages/ReferralDashboard"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FlexReport = lazy(() => import("./pages/FlexReport"));
const AmazonOAuthCallback = lazy(() => import("./pages/AmazonOAuthCallback"));
const AmazonTransactionsTest = lazy(() => import("./pages/AmazonTransactionsTest"));
const SampleDataGenerator = lazy(() => import("./pages/SampleDataGenerator"));
const MatchTransactions = lazy(() => import("./pages/MatchTransactions"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ExcludeTodayProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PaymentAccessControl>
          <Suspense fallback={<LoadingScreen />}>
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
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <Admin />
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
              <Dashboard />
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
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
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
          <Route path="/amazon-oauth-callback" element={<AmazonOAuthCallback />} />
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          <Route path="/amazon-transactions-test" element={
            <ProtectedRoute>
              <AmazonTransactionsTest />
            </ProtectedRoute>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </PaymentAccessControl>
      </TooltipProvider>
      </ExcludeTodayProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
