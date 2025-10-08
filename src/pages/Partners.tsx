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
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <span className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Partner Programs
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            Auren Partner Programs
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Grow your income while helping sellers stay cashflow-positive
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover-scale group relative overflow-hidden"
              onClick={() => navigate('/referral-dashboard')}
            >
              <span className="relative z-10">Start Referring</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary/30 hover:bg-primary/5 hover-scale backdrop-blur"
              onClick={() => navigate('/affiliate-dashboard')}
            >
              Become an Affiliate
            </Button>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-sm font-medium text-primary">For Users</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Auren Rewards
            </h2>
            <p className="text-lg text-muted-foreground">Turn your network into rewards</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-xl bg-gradient-primary">
                  <Gift className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mt-4">Refer & Earn</CardTitle>
                <CardDescription>Get rewarded for every friend who subscribes</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ul className="space-y-3">
                  {[
                    { count: '1 friend', reward: '15% off next 3 months' },
                    { count: '2 friends', reward: '20% off next 3 months' },
                    { count: '5 friends', reward: '25% off + $50' },
                    { count: '10 friends', reward: '30% off + $100' },
                    { count: '20 friends', reward: '40% off + $200' },
                    { count: '50 friends', reward: '50% off + $1,000', highlight: true },
                    { count: '100 friends', reward: '6 months free + $3,000', highlight: true }
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-3 p-2 rounded-lg ${item.highlight ? 'bg-primary/10 border border-primary/20' : ''}`}>
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">
                        <span className="font-semibold text-foreground">{item.count}</span>
                        <span className="text-muted-foreground"> → {item.reward}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-xl bg-gradient-primary">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mt-4">How It Works</CardTitle>
                <CardDescription>Simple 3-step process</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-6">
                {[
                  { num: '01', text: 'Share your unique referral link' },
                  { num: '02', text: 'Your friend signs up and subscribes' },
                  { num: '03', text: 'You get your reward automatically' }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                      {step.num}
                    </div>
                    <p className="text-sm mt-3">{step.text}</p>
                  </div>
                ))}
                <div className="mt-8 p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20 backdrop-blur">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
                    Important
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Referrals only count after subscription - trial signups alone don't qualify
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Affiliate Program */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <span className="text-sm font-medium text-accent-foreground">For Partners</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Auren Partners
            </h2>
            <p className="text-lg text-muted-foreground">For Influencers, CPAs & Agencies</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-xl bg-muted">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl mt-4">Starter Tier</CardTitle>
                <CardDescription>1-5 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-6">
                  <p className="text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">20%</p>
                  <p className="text-sm text-muted-foreground mt-2">Recurring commission on all referrals</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group hover-scale border-primary bg-gradient-to-br from-primary/10 via-card to-accent/10 backdrop-blur overflow-hidden scale-105 shadow-2xl shadow-primary/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-b-lg">
                <span className="text-xs font-bold text-primary-foreground">POPULAR</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <CardHeader className="relative pt-8">
                <div className="p-3 w-fit rounded-xl bg-gradient-primary">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl mt-4">Growth Tier</CardTitle>
                <CardDescription>6-20 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-4">
                  <p className="text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">25%</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">Recurring commission</p>
                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                    <p className="text-sm font-semibold">+ $100 per 10 referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-xl bg-muted">
                  <Users className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl mt-4">Pro Tier</CardTitle>
                <CardDescription>21+ monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-6">
                  <p className="text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">30%</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">Recurring commission</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Co-branding opportunities
                    </p>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Dedicated support
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/5 backdrop-blur">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/20 to-transparent blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="text-2xl">Affiliate Benefits</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    What You Get
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Lifetime recurring commissions',
                      'Monthly payouts (Net-30)',
                      'Full analytics dashboard',
                      'Custom tracking links',
                      'Marketing materials & assets'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm group/item">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-accent" />
                    Perfect For
                  </h3>
                  <ul className="space-y-3">
                    {[
                      { icon: '📹', text: 'YouTube creators' },
                      { icon: '💼', text: 'Financial advisors' },
                      { icon: '🎯', text: 'eCommerce consultants' },
                      { icon: '📦', text: 'Amazon agencies' },
                      { icon: '🚀', text: 'Business coaches' }
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8 text-primary-foreground">
          <h2 className="text-5xl md:text-6xl font-bold leading-tight animate-scale-in">
            Ready to Get Started?
          </h2>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
            Join thousands earning rewards by helping sellers succeed
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              variant="secondary" 
              className="hover-scale shadow-xl group relative overflow-hidden"
              onClick={() => navigate('/referral-dashboard')}
            >
              <span className="relative z-10">Start Referring</span>
              <div className="absolute inset-0 bg-gradient-to-r from-background/0 via-background/20 to-background/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground hover-scale backdrop-blur"
              onClick={() => navigate('/affiliate-dashboard')}
            >
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