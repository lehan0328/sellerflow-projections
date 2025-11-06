import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  FileText,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

export const GuidesContent = () => {
  const [searchTerm, setSearchTerm] = useState("");

  type Guide = string | { title: string; path: string };
  
  const guideSections = [
    {
      title: "Income & Expenses",
      description: "Managing your business income and expenses",
      icon: <TrendingUp className="h-6 w-6" />,
      path: "/guides/income-expenses",
      guides: [
        {
          title: "Manually Adding a Purchase Order",
          path: "/guides/purchase-orders"
        },
        {
          title: "AI PO autofill (Growing+ plans only)",
          path: "/guides/ai-po-autofill"
        },
        {
          title: "Adding Additional Income",
          path: "/guides/adding-income"
        },
        {
          title: "Add Recurring Income",
          path: "/guides/add-recurring-income"
        },
        {
          title: "Add Recurring Expense",
          path: "/guides/add-recurring-expense"
        },
        {
          title: "Editing transactions",
          path: "/guides/editing-transactions"
        }
      ]
    },
    {
      title: "Vendor Management",
      description: "Managing your suppliers and vendors",
      icon: <Users className="h-6 w-6" />,
      path: "/guides/vendors",
      guides: [
        "Adding New Vendors",
        "Setting Payment Terms",
        "Vendor Communication"
      ]
    },
    {
      title: "Amazon Operations",
      description: "Working with Amazon data and forecasts",
      icon: <ShoppingCart className="h-6 w-6" />,
      path: "/guides/amazon",
      guides: [
        "Reading Payout Forecasts",
        "Understanding Settlement Reports",
        "Multi-Marketplace Management"
      ]
    },
    {
      title: "Bank Accounts",
      description: "Managing bank connections and transactions",
      icon: <CreditCard className="h-6 w-6" />,
      path: "/guides/bank-accounts",
      guides: [
        "Connecting Bank Accounts",
        "Reviewing Transactions",
        "Categorizing Expenses"
      ]
    },
    {
      title: "Cash Flow Analysis",
      description: "Understanding your cash flow forecasts",
      icon: <FileText className="h-6 w-6" />,
      path: "/guides/cash-flow",
      guides: [
        "Reading the Dashboard",
        "Safe Spending Calculator",
        "90-Day Forecast"
      ]
    }
  ];

  const filteredSections = guideSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.guides.some(guide => {
      const guideTitle = typeof guide === 'string' ? guide : guide.title;
      return guideTitle.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">
          Step-by-Step Guides
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Learn how to use Auren's features with detailed, visual step-by-step guides
        </p>
      </div>

      <Separator className="my-8" />

      {/* Signature Features */}
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Signature Features</h3>
          <p className="text-muted-foreground">Explore Auren's most powerful capabilities</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/guides/payout-forecasting" className="group">
            <Card className="relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/20" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/0 via-amber-600/0 to-yellow-600/0 group-hover:from-orange-600/10 group-hover:via-amber-600/10 group-hover:to-yellow-600/10 transition-all duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">Payout Forecasting (Amazon)</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Accurately forecast your payouts 3 months in advance based on your Amazon sales history to help plan purchases
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/guides/advanced-po-planning" className="group">
            <Card className="relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/20 to-indigo-500/20" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-violet-600/0 to-indigo-600/0 group-hover:from-purple-600/10 group-hover:via-violet-600/10 group-hover:to-indigo-600/10 transition-all duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">Advanced PO planning</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Project your pending POs and view updated buying opportunities
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/guides/search-by-amount" className="group">
            <Card className="relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 via-purple-600/0 to-pink-600/0 group-hover:from-blue-600/10 group-hover:via-purple-600/10 group-hover:to-pink-600/10 transition-all duration-300" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">Search by Amount</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Find the earliest date you can spend any amount
                </p>
              </CardContent>
            </Card>
          </Link>

          <div className="lg:col-span-3 flex justify-center gap-4 flex-wrap md:flex-nowrap">
            <Link to="/guides/search-by-date" className="group w-full md:w-auto md:max-w-sm">
              <Card className="relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/0 via-teal-600/0 to-cyan-600/0 group-hover:from-emerald-600/10 group-hover:via-teal-600/10 group-hover:to-cyan-600/10 transition-all duration-300" />
                <CardHeader className="relative pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-lg">Search by Date</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Know exactly what you can spend on any given date
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/guides/scenario-planning" className="group w-full md:w-auto md:max-w-sm">
              <Card className="relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-sky-500/20 to-blue-500/20" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 via-sky-600/0 to-blue-600/0 group-hover:from-cyan-600/10 group-hover:via-sky-600/10 group-hover:to-blue-600/10 transition-all duration-300" />
                <CardHeader className="relative pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-500">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-lg">Scenario Planning</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Plan out your cash balance projection no matter the scenario fully customizable
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Guide Sections */}
      <div className="space-y-8">
        <h3 className="text-2xl font-bold">Browse by Category</h3>
        
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSections.map((section, index) => (
            <Card 
              key={index} 
              className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale animate-fade-in" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {section.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {section.guides.map((guide, guideIndex) => {
                    const isGuideObject = typeof guide === 'object' && guide !== null && 'title' in guide;
                    const guideTitle: string = isGuideObject ? (guide as { title: string; path: string }).title : (guide as string);
                    const guidePath = isGuideObject ? (guide as { title: string; path: string }).path : `${section.path}#${(guide as string).toLowerCase().replace(/\s+/g, '-')}`;
                    
                    return (
                      <li key={guideIndex}>
                        <Link 
                          to={guidePath}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group"
                        >
                          <span>{guideTitle}</span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {searchTerm && filteredSections.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            Try searching with different keywords or browse our categories above.
          </p>
        </div>
      )}
    </div>
  );
};
