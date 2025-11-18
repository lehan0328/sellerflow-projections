import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card } from "@/components/ui/card";

export default function GuidesAddingExpenses() {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section !== "guides") {
      navigate(`/${section}`);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar 
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <SidebarInset>
        <Helmet>
          <title>Adding Expenses - Auren</title>
          <meta name="description" content="Learn how to add a new expense category in Auren" />
        </Helmet>
        
        <div className="flex-1 space-y-6 p-4 md:p-6">
          <div className="sticky top-0 z-10 bg-background pb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/guides")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Button>
            <h1 className="text-3xl font-bold">Adding Expenses</h1>
          </div>

          <Card className="p-6">
            <iframe 
              src="https://scribehow.com/embed/How_to_Add_a_New_Expense_Category_in_Auren__WkBf5-4VTaWjjQ5Y7c8mTw?removeLogo=true" 
              width="100%" 
              height="800" 
              allow="fullscreen" 
              style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
              title="How to Add a New Expense Category in Auren"
            />
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
