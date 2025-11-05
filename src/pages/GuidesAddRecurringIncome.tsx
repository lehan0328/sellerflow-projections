import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GuidesAddRecurringIncome = () => {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  const handleSectionChange = (section: string) => {
    if (section === 'guides') {
      navigate('/guides');
    } else {
      navigate('/dashboard', { state: { activeSection: section } });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <SidebarInset className="flex-1 bg-background">
          <Helmet>
            <title>Add Recurring Income Guide - Auren</title>
            <meta name="description" content="Learn how to add recurring income to forecast predictable revenue in Auren" />
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
            <h1 className="text-xl font-semibold">Add Recurring Income</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Introduction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    What is Recurring Income?
                  </CardTitle>
                  <CardDescription>
                    Recurring income allows you to forecast predictable revenue that repeats on a regular schedule, such as subscription fees, retainer payments, or monthly service contracts.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Interactive Guide */}
              <Card>
                <CardHeader>
                  <CardTitle>Interactive Step-by-Step Guide</CardTitle>
                  <CardDescription>
                    Follow along with this interactive guide to add recurring income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe 
                    src="https://scribehow.com/embed/Add_Recurring_Income__TbJBrNi7Tp6XePgCI3-cMw?removeLogo=true" 
                    width="100%" 
                    height="800" 
                    allow="fullscreen" 
                    style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
                    title="Add Recurring Income Guide"
                  />
                </CardContent>
              </Card>

              {/* Step by step guide */}
              <Card>
                <CardHeader>
                  <CardTitle>How to Add Recurring Income</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        1
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Navigate to Recurring Expenses</h3>
                        <p className="text-sm text-muted-foreground">
                          From your dashboard, click on the menu and select "Recurring Expenses". This page manages both recurring expenses and income.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        2
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Click "Add Recurring Transaction"</h3>
                        <p className="text-sm text-muted-foreground">
                          Click the "Add Recurring Transaction" button at the top of the page to open the form.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        3
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Select "Income" as Transaction Type</h3>
                        <p className="text-sm text-muted-foreground">
                          In the form that appears, you'll see two options: Income and Expense. Click on "Income" to create recurring revenue.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        4
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Fill in Income Details
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                          <li><strong>Transaction Name:</strong> Enter a descriptive name (e.g., "Monthly Subscription Fee", "Retainer Payment")</li>
                          <li><strong>Amount:</strong> Enter the income amount in dollars</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        5
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Set the Schedule
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                          <li><strong>Start Date:</strong> When the recurring income begins</li>
                          <li><strong>End Date (Optional):</strong> If the income has an end date (max 3 months out)</li>
                          <li><strong>Frequency:</strong> Choose how often the income repeats:
                            <ul className="ml-6 mt-1 space-y-1">
                              <li>• Daily</li>
                              <li>• Weekly</li>
                              <li>• Bi-weekly (every 2 weeks)</li>
                              <li>• Weekdays (Monday-Friday)</li>
                              <li>• Monthly</li>
                              <li>• Yearly</li>
                            </ul>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        6
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Add Category and Notes</h3>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                          <li><strong>Category:</strong> Select an existing category or create a new one by clicking "Add New Category"</li>
                          <li><strong>Notes (Optional):</strong> Add any additional details or context</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        7
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Save and View in Calendar</h3>
                        <p className="text-sm text-muted-foreground">
                          Click "Add Recurring Income" to save. The income will now appear on your cash flow calendar on all scheduled dates, helping you forecast your cash position accurately.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Pro Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Use clear names:</strong> Name your recurring income clearly so you can easily identify it in reports and forecasts.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Set end dates for contracts:</strong> If you have fixed-term contracts, set an end date to ensure accurate long-term forecasting.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Create categories:</strong> Organize recurring income by creating categories like "Subscriptions", "Retainers", or "Service Contracts" for better reporting.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Review regularly:</strong> Update or deactivate recurring income when contracts change or end.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesAddRecurringIncome;
