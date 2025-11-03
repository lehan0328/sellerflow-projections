import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, DollarSign, Users, TrendingUp, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";

export default function Partners() {
  const navigate = useNavigate();
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Partner Program - Amazon Cashflow Software Referrals | Auren</title>
        <meta name="description" content="Join the Auren partner program and earn commissions referring amazon cashflow management software. Help marketplace sellers with cash flow management tools." />
        <meta name="keywords" content="amazon cashflow software affiliate, marketplace cash flow management partner, cashflow software referral program" />
        <link rel="canonical" href="https://aurenapp.com/partners" />
      </Helmet>

      {/* Sticky CTA */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg animate-slide-up">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-semibold">Get clarity before your next Amazon payout</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">No credit card required</span>
              </div>
            </div>
            <Button onClick={() => navigate('/signup')} className="bg-gradient-primary whitespace-nowrap">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader activePage="partners" />

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
              Partner Programs • Earn Up To $2,000+
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold leading-relaxed">
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%] pb-3">
              Grow Together,
            </span>
            <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent pb-3">
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
              onClick={() => document.getElementById('affiliate-section')?.scrollIntoView({ behavior: 'smooth' })}
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
                    href="mailto:support@aurenapp.com" 
                    className="text-primary hover:text-accent transition-colors font-semibold underline decoration-primary/30 hover:decoration-accent"
                  >
                    Email support@aurenapp.com
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
                    { count: '20 friends', reward: '40% off + $200' }
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">
                        <span className="font-semibold text-foreground">{item.count}</span>
                        <span className="text-muted-foreground"> → {item.reward}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Premium Tiers - Extra Loud */}
                <div className="mt-6 space-y-4">
                  {/* 50 Friends Tier */}
                  <div className="relative group p-6 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-2 border-primary/40 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/50 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-shimmer bg-[length:200%_100%]" />
                    <div className="absolute top-2 right-2 px-3 py-1 bg-primary rounded-full">
                      <span className="text-xs font-bold text-primary-foreground">PREMIUM</span>
                    </div>
                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/50 animate-glow-pulse">
                          <Gift className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                            50 friends
                          </p>
                          <p className="text-lg font-semibold text-foreground mt-1">
                            50% off + <span className="text-primary">$1,000</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 100 Friends Tier - Even Bigger */}
                  <div className="relative group p-8 rounded-2xl bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30 border-2 border-accent hover:border-accent/80 transition-all duration-300 shadow-2xl hover:shadow-accent/60 overflow-hidden scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 animate-shimmer bg-[length:200%_100%]" />
                    <div className="absolute -top-1 -right-1 w-32 h-32 bg-accent/40 rounded-full blur-3xl animate-glow-pulse" />
                    <div className="absolute top-2 right-2 px-4 py-1.5 bg-gradient-to-r from-accent to-primary rounded-full shadow-lg">
                      <span className="text-sm font-bold text-primary-foreground">🔥 ULTIMATE REWARD</span>
                    </div>
                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-2xl shadow-accent/50 animate-glow-pulse">
                          <TrendingUp className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-4xl font-bold bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                            100 friends
                          </p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            6 months FREE + <span className="text-accent">$2,000</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
      <section id="affiliate-section" className="relative py-24 px-6 overflow-hidden">
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
            <p className="text-xl text-muted-foreground">For Influencers, CPAs & Agencies</p>
          </div>

          {/* Commission Highlight */}
          <div className="max-w-3xl mx-auto mb-16">
            <Card className="relative group border-2 border-accent bg-gradient-to-br from-accent/15 via-primary/10 to-accent/15 backdrop-blur overflow-hidden shadow-2xl shadow-accent/40">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 opacity-60" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/40 rounded-full blur-3xl animate-glow-pulse" />
              <CardContent className="relative py-16 px-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/30 to-primary/30 border border-accent/40 mb-6">
                  <DollarSign className="h-5 w-5 text-accent" />
                  <span className="text-sm font-bold text-accent-foreground">Lifetime Commission</span>
                </div>
                <p className="text-8xl md:text-9xl font-bold bg-gradient-to-br from-accent via-primary to-accent bg-clip-text text-transparent mb-4">
                  40%
                </p>
                <p className="text-2xl text-muted-foreground">
                  Earn up to <span className="text-accent font-bold">40% recurring commission</span> on every referral
                </p>
              </CardContent>
            </Card>
          </div>


          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/5 backdrop-blur">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/20 to-transparent blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="text-2xl">Affiliate Benefits</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
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

              {/* How to Become an Affiliate */}
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="font-semibold text-xl mb-6 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  How to Become an Affiliate
                </h3>
                <div className="p-6 rounded-2xl bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 border border-accent/30 backdrop-blur">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/30">
                      <DollarSign className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-base font-medium text-foreground">
                        Interested in joining our affiliate program?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We carefully select partners who align with our mission to help marketplace sellers succeed. To apply, please reach out to us directly and tell us about your audience and how you can help promote Auren.
                      </p>
                      <a 
                        href="mailto:andy@aurenapp.com" 
                        className="inline-flex items-center gap-2 text-base font-semibold text-accent hover:text-primary transition-colors group"
                      >
                        <span className="underline decoration-accent/30 group-hover:decoration-primary">
                          Email andy@aurenapp.com
                        </span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </a>
                    </div>
                  </div>
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
    </>
  );
}