import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import aurenIcon from "@/assets/auren-icon-blue.png";

export const PublicFooter = () => {
  return (
    <footer className="border-t bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                <img src={aurenIcon} alt="Auren - Cash Flow Management for Amazon Sellers" className="h-8 w-8" />
              </div>
              <span className="text-xl font-bold">Auren</span>
            </div>
            <p className="text-muted-foreground">
              The cash flow management solution built specifically for Amazon sellers. Forecast payouts, track expenses, and grow with confidence.
            </p>
            <div className="flex gap-4 pt-2">
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <a href="https://twitter.com/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <a href="https://linkedin.com/company/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Product</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/demo" className="hover:text-foreground transition-colors">Live Demo</Link></li>
              <li><Link to="/features" className="hover:text-foreground transition-colors">All Features</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link to="/docs/getting-started" className="hover:text-foreground transition-colors">Getting Started</Link></li>
              <li><Link to="/docs/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Company</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="/support" className="hover:text-foreground transition-colors">Support</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; 2025 Auren. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Read-Only Access</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
