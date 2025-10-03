import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DemoPage from "./pages/DemoPage";
import Settings from "./pages/Settings";
import { SignUp } from "./pages/SignUp";
import UpgradePlan from "./pages/UpgradePlan";
import TransactionLog from "./pages/TransactionLog";
import BankTransactions from "./pages/BankTransactions";
import Analytics from "./pages/Analytics";
import ScenarioPlanner from "./pages/ScenarioPlanner";
import OAuthRedirect from "./pages/OAuthRedirect";
import NotFound from "./pages/NotFound";
import Docs from "./pages/Docs";
import DocsGettingStarted from "./pages/DocsGettingStarted";
import DocsAmazonIntegration from "./pages/DocsAmazonIntegration";
import DocsFAQ from "./pages/DocsFAQ";
import { Auth } from "./pages/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/getting-started" element={<DocsGettingStarted />} />
          <Route path="/docs/amazon-integration" element={<DocsAmazonIntegration />} />
          <Route path="/docs/faq" element={<DocsFAQ />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
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
                <ScenarioPlanner />
              </ProtectedRoute>
            } />
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
