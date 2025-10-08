import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, DollarSign, Users, TrendingUp, Sun, Moon, Lock } from "lucide-react";
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
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s', animationDuration: '8s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[80px] animate-glow-pulse" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border border-primary/30 mb-4 backdrop-blur-sm animate-shimmer bg-[length:200%_100%]">
            <Gift className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              Partner Programs • Earn Up To $3,000+
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              Grow Together,
            </span>
            <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Earn Together
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn your network into <span className="text-primary font-semibold">recurring income</span> while helping sellers achieve financial clarity
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover-scale group relative overflow-hidden text-lg px-8 py-7 shadow-2xl shadow-primary/50"
              onClick={() => navigate('/referral-dashboard')}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Start Referring Now
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary/40 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 hover-scale backdrop-blur text-lg px-8 py-7 hover:border-primary"
              onClick={() => navigate('/affiliate-dashboard')}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Become an Affiliate
            </Button>
          </div>
          
          {/* Sign-in Notice */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 border border-primary/20 backdrop-blur max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2 text-left">
                <p className="text-sm font-medium text-foreground">
                  Sign in required to access partner programs
                </p>
                <p className="text-sm text-muted-foreground">
                  You need to create an account or sign in to access the referral dashboard and affiliate program. Have questions?{' '}
                  <a 
                    href="mailto:andy@aurenapp.com" 
                    className="text-primary hover:text-accent transition-colors font-semibold underline decoration-primary/30 hover:decoration-accent"
                  >
                    Email andy@aurenapp.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(var(--accent-rgb),0.1),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 mb-4 backdrop-blur">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-primary">For Users</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                Auren Rewards
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Turn your network into <span className="text-accent font-semibold">exclusive rewards</span></p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="relative group hover-scale border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 backdrop-blur overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
              <CardHeader className="relative">
                <div className="p-4 w-fit rounded-2xl bg-gradient-primary shadow-lg shadow-primary/50 animate-glow-pulse">
                  <Gift className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-3xl mt-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Refer & Earn</CardTitle>
                <CardDescription className="text-base">Get rewarded for every friend who subscribes</CardDescription>
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

            <Card className="relative group hover-scale border-accent/30 bg-gradient-to-br from-accent/5 via-card to-primary/5 backdrop-blur overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
              <CardHeader className="relative">
                <div className="p-4 w-fit rounded-2xl bg-gradient-to-r from-accent to-primary shadow-lg shadow-accent/50 animate-glow-pulse" style={{ animationDelay: '0.5s' }}>
                  <Users className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-3xl mt-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">How It Works</CardTitle>
                <CardDescription className="text-base">Simple 3-step process</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-6">
                {[
                  { num: '01', text: 'Share your unique referral link' },
                  { num: '02', text: 'Your friend signs up and subscribes' },
                  { num: '03', text: 'You get your reward automatically' }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start group/step">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30 group-hover/step:scale-110 transition-transform duration-300">
                      {step.num}
                    </div>
                    <p className="text-base mt-4 group-hover/step:text-foreground transition-colors">{step.text}</p>
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
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--accent-rgb),0.15),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 mb-4 backdrop-blur">
              <DollarSign className="h-4 w-4 text-accent animate-pulse" />
              <span className="text-sm font-bold text-accent-foreground">For Partners</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                Auren Partners
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">For Influencers, CPAs & Agencies • <span className="text-accent font-semibold">30% Lifetime Commission</span></p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="relative group hover-scale border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background backdrop-blur overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute top-4 right-4 w-20 h-20 bg-primary/30 rounded-full blur-2xl animate-glow-pulse" />
              <CardHeader className="relative">
                <div className="p-4 w-fit rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/40">
                  <DollarSign className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mt-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Starter Tier</CardTitle>
                <CardDescription className="text-base">1-5 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-6">
                  <p className="text-6xl font-bold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">20%</p>
                  <p className="text-base text-muted-foreground mt-3">Recurring commission on all referrals</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group hover-scale border-2 border-accent bg-gradient-to-br from-accent/15 via-primary/10 to-accent/15 backdrop-blur overflow-hidden scale-105 shadow-2xl shadow-accent/40 hover:shadow-accent/60 transition-all duration-500">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-accent via-primary to-accent rounded-b-2xl shadow-lg animate-shimmer bg-[length:200%_100%]">
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  MOST POPULAR
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <div className="absolute bottom-4 right-4 w-24 h-24 bg-accent/40 rounded-full blur-3xl animate-glow-pulse" />
              <CardHeader className="relative pt-12">
                <div className="p-5 w-fit rounded-2xl bg-gradient-to-br from-accent to-primary shadow-xl shadow-accent/50 animate-glow-pulse">
                  <TrendingUp className="h-10 w-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-3xl mt-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Growth Tier</CardTitle>
                <CardDescription className="text-base font-medium">6-20 monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-4">
                  <p className="text-7xl font-bold bg-gradient-to-br from-accent via-primary to-accent bg-clip-text text-transparent">25%</p>
                  <p className="text-base text-muted-foreground mt-3 mb-4">Recurring commission</p>
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-accent/30 to-primary/30 border-2 border-accent/40 backdrop-blur shadow-lg">
                    <p className="text-lg font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">+ $100 per 10 referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group hover-scale border-accent/30 bg-gradient-to-br from-accent/10 via-card to-background backdrop-blur overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-accent/30">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-4 left-4 w-20 h-20 bg-accent/30 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
              <CardHeader className="relative">
                <div className="p-4 w-fit rounded-2xl bg-gradient-to-br from-accent to-primary shadow-lg shadow-accent/40">
                  <Users className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mt-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Pro Tier</CardTitle>
                <CardDescription className="text-base">21+ monthly referrals</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="mb-6">
                  <p className="text-6xl font-bold bg-gradient-to-br from-accent via-primary to-accent bg-clip-text text-transparent">30%</p>
                  <p className="text-base text-muted-foreground mt-3 mb-4">Recurring commission</p>
                  <div className="space-y-3">
                    <p className="text-base font-medium flex items-center gap-3 group/item">
                      <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                      Co-branding opportunities
                    </p>
                    <p className="text-base font-medium flex items-center gap-3 group/item">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/15" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-primary/40 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-accent/40 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 border border-primary/40 mb-4 backdrop-blur animate-shimmer bg-[length:200%_100%]">
            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-base font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Start Earning Today
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              Ready to Grow
            </span>
            <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mt-2">
              Your Income?
            </span>
          </h2>
          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join <span className="text-primary font-bold">hundreds of partners</span> earning <span className="text-accent font-bold">recurring income</span> with Auren
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 pt-8">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover-scale group relative overflow-hidden text-xl px-10 py-8 shadow-2xl shadow-primary/50 hover:shadow-primary/70"
              onClick={() => navigate('/referral-dashboard')}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Gift className="h-6 w-6" />
                Start Referring Now
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary/50 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 hover-scale backdrop-blur text-xl px-10 py-8 hover:border-primary"
              onClick={() => navigate('/affiliate-dashboard')}
            >
              <DollarSign className="mr-2 h-6 w-6" />
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