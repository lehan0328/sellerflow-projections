import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, DollarSign, Users, TrendingUp, Sun, Moon } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import aurenIcon from "@/assets/auren-icon-blue.png";

export default function Partners() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-scale-in cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
                <img src={aurenIcon} alt="Auren Logo" className="relative h-12 w-12 hover-scale transition-all duration-300" />
              </div>
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Auren
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/features" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Features
              </Link>
              <Link to="/#pricing" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Plans
              </Link>
              <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Blog
              </Link>
              <Link to="/partners" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Partners
              </Link>
              <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Docs
              </Link>
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
                className="bg-gradient-primary hover-scale transition-all duration-200 hover:shadow-lg hover:shadow-primary/50" 
                onClick={() => navigate('/#pricing')}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold">Auren Partner Programs</h1>
          <p className="text-xl text-muted-foreground">
            Grow your income while helping sellers stay cashflow-positive
          </p>
          <div className="flex justify-center gap-4 pt-6">
            <Button size="lg" onClick={() => navigate('/referral-dashboard')}>
              Start Referring
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/affiliate-dashboard')}>
              Become an Affiliate
            </Button>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="py-16 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Auren Rewards</h2>
            <p className="text-lg text-muted-foreground">For Auren Users</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <Gift className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Refer & Earn</CardTitle>
                <CardDescription>Get rewarded for every friend who subscribes</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ 1 friend → 15% off next 3 months</li>
                  <li>✓ 2 friends → 20% off next 3 months</li>
                  <li>✓ 5 friends → 25% off + $50</li>
                  <li>✓ 10 friends → 30% off + $100</li>
                  <li>✓ 20 friends → 40% off + $200</li>
                  <li>✓ 50 friends → 50% off + $1,000</li>
                  <li>✓ 100 friends → 6 months free + $3,000</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Simple 3-step process</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li>1. Share your unique referral link</li>
                  <li>2. Your friend signs up and subscribes</li>
                  <li>3. You get your reward automatically</li>
                </ol>
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Important:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Referrals only count after subscription - trial signups alone don't qualify
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Affiliate Program */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Auren Partners</h2>
            <p className="text-lg text-muted-foreground">For Influencers, CPAs & Agencies</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card>
              <CardHeader>
                <DollarSign className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Starter Tier</CardTitle>
                <CardDescription>1-5 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">20%</p>
                <p className="text-sm text-muted-foreground">Recurring commission on all referrals</p>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Growth Tier</CardTitle>
                <CardDescription>6-20 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">25%</p>
                <p className="text-sm text-muted-foreground mb-2">Recurring commission</p>
                <p className="text-sm font-medium">+ $100 per 10 referrals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Pro Tier</CardTitle>
                <CardDescription>21+ monthly referrals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">30%</p>
                <p className="text-sm text-muted-foreground mb-2">Recurring commission</p>
                <p className="text-sm font-medium">+ Co-branding & dedicated support</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Affiliate Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">What You Get:</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Lifetime recurring commissions</li>
                    <li>✓ Monthly payouts (Net-30)</li>
                    <li>✓ Full analytics dashboard</li>
                    <li>✓ Custom tracking links</li>
                    <li>✓ Marketing materials & assets</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Perfect For:</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• YouTube creators</li>
                    <li>• Financial advisors</li>
                    <li>• eCommerce consultants</li>
                    <li>• Amazon agencies</li>
                    <li>• Business coaches</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl opacity-90">
            Join thousands earning rewards by helping sellers succeed
          </p>
          <div className="flex justify-center gap-4 pt-6">
            <Button size="lg" variant="secondary" onClick={() => navigate('/referral-dashboard')}>
              Start Referring
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/affiliate-dashboard')}>
              Apply as Affiliate
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Partners</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/referral-dashboard" className="hover:text-foreground transition-colors">Referral Program</Link></li>
                <li><Link to="/affiliate-dashboard" className="hover:text-foreground transition-colors">Affiliate Program</Link></li>
                <li><Link to="/partners" className="hover:text-foreground transition-colors">Partner Benefits</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/support" className="hover:text-foreground transition-colors">Support</Link></li>
                <li><Link to="/schedule-demo" className="hover:text-foreground transition-colors">Schedule Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><a href="mailto:support@aurenapp.com" className="hover:text-foreground transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Auren. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}