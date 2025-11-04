import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

const GuidesPayoutForecasting = () => {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <SidebarInset className="flex-1 bg-background">
          <Helmet>
            <title>Payout Forecasting (Amazon) - Guides - Auren</title>
            <meta name="description" content="Learn how to forecast your Amazon payouts 3 months in advance" />
          </Helmet>

          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/guides')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Guides
            </Button>
            <h1 className="text-xl font-semibold">Payout Forecasting (Amazon)</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-5xl mx-auto">
              <div className="rounded-lg overflow-hidden border bg-card">
                <iframe 
                  src="https://scribehow.com/embed/Update_Advanced_Forecast_Settings__92s-O5m4QuWrg8AdHfXyFQ?removeLogo=true" 
                  width="100%" 
                  height="800" 
                  allow="fullscreen" 
                  style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
                  title="Payout Forecasting Guide"
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesPayoutForecasting;
