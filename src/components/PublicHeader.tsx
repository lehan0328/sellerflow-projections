import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, ChevronDown, Menu, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PublicHeaderProps {
  activePage?: string;
}

export const PublicHeader = ({ activePage }: PublicHeaderProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <nav className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50 animate-fade-in">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 animate-scale-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
              <img src={aurenIcon} alt="Auren - Amazon Cash Flow Forecasting Software" className="relative h-12 w-12 hover-scale transition-all duration-300" />
            </div>
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            <span className="text-2xl font-bold font-display bg-gradient-primary bg-clip-text text-transparent">
              Auren
            </span>
            </span>
          </Link>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/features" onClick={() => window.scrollTo(0, 0)} className={`${activePage === 'features' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Features
            </Link>
            <Link to="/pricing" className={`${activePage === 'pricing' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Pricing
            </Link>
            <Link to="/#testimonials" className={`${activePage === 'reviews' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Reviews
            </Link>
            <Link to="/blog" onClick={() => window.scrollTo(0, 0)} className={`${activePage === 'blog' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Blog
            </Link>
            <Link to="/partners" className={`${activePage === 'partners' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Partners
            </Link>
            <Link to="/contact" className={`${activePage === 'contact' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Contact
            </Link>
            <Link to="/docs" className={`${activePage === 'docs' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-all duration-300 story-link font-medium`}>
              Docs
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground transition-all duration-300 font-medium gap-1">
                  Coming Soon
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuItem asChild>
                  <Link to="/inventory" className="cursor-pointer">
                    Inventory
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/reimbursements" className="cursor-pointer">
                    Reimbursements
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/advanced-analytics" className="cursor-pointer">
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/accounting" className="cursor-pointer">
                    Accounting
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/platforms" className="cursor-pointer">
                    Walmart, Shopify & More
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover-scale transition-all duration-200"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="hover-scale transition-all duration-200 border-primary/20 hover:border-primary/40" 
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-primary hover-scale transition-all duration-200"
              onClick={() => navigate('/signup')}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col gap-6 mt-8">
            {/* Navigation Links */}
            <div className="flex flex-col gap-4">
              <Link 
                to="/features" 
                onClick={() => { window.scrollTo(0, 0); setMobileMenuOpen(false); }}
                className={`${activePage === 'features' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Features
              </Link>
              <Link 
                to="/pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className={`${activePage === 'pricing' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Pricing
              </Link>
              <Link 
                to="/#testimonials" 
                onClick={() => setMobileMenuOpen(false)}
                className={`${activePage === 'reviews' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Reviews
              </Link>
              <Link 
                to="/blog" 
                onClick={() => { window.scrollTo(0, 0); setMobileMenuOpen(false); }}
                className={`${activePage === 'blog' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Blog
              </Link>
              <Link 
                to="/partners" 
                onClick={() => setMobileMenuOpen(false)}
                className={`${activePage === 'partners' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Partners
              </Link>
              <Link 
                to="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className={`${activePage === 'contact' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Contact
              </Link>
              <Link 
                to="/docs" 
                onClick={() => setMobileMenuOpen(false)}
                className={`${activePage === 'docs' ? 'text-foreground font-semibold' : 'text-muted-foreground'} text-lg py-2 hover:text-foreground transition-colors`}
              >
                Docs
              </Link>
              
              {/* Coming Soon Items */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Coming Soon</p>
                <div className="flex flex-col gap-3 pl-4">
                  <Link 
                    to="/inventory" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Inventory
                  </Link>
                  <Link 
                    to="/reimbursements" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reimbursements
                  </Link>
                  <Link 
                    to="/advanced-analytics" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Analytics
                  </Link>
                  <Link 
                    to="/accounting" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Accounting
                  </Link>
                  <Link 
                    to="/platforms" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Walmart, Shopify & More
                  </Link>
                </div>
              </div>
            </div>

            {/* Theme Toggle & CTAs */}
            <div className="border-t pt-6 mt-auto flex flex-col gap-3">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-5 w-5 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 ml-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span>Toggle Theme</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-primary/20 hover:border-primary/40" 
                onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
              >
                Sign In
              </Button>
              
              <Button 
                className="w-full bg-gradient-primary"
                onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};
