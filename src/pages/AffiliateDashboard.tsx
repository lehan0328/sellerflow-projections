import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, DollarSign, TrendingUp, Users, Sparkles, Zap, Target, Award, ArrowLeft } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AffiliateDashboard() {
  const { loading, affiliate, referrals, payouts, applyAsAffiliate, copyAffiliateLink } = useAffiliates();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    follower_count: '',
    audience_description: '',
    promotional_methods: '',
  });

  if (loading) {
    return <LoadingScreen message="Loading affiliate dashboard..." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyAsAffiliate(formData);
  };

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[140px] animate-float" style={{ animationDelay: '2s', animationDuration: '8s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-glow-pulse" />
        </div>

        <div className="relative max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border border-primary/30 mb-6 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Affiliate Program Application
              </span>
            </div>
            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                Join Auren Partners
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">Apply to become an affiliate and earn recurring commissions</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="relative group border-primary/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-2xl bg-gradient-primary shadow-lg shadow-primary/50 animate-glow-pulse mb-4">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Application Form</CardTitle>
                <CardDescription>Tell us about yourself and your audience</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name (Optional)</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="follower_count">Follower Count *</Label>
                  <Input
                    id="follower_count"
                    type="number"
                    required
                    min="0"
                    value={formData.follower_count}
                    onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                    placeholder="e.g., 10000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="audience">Describe Your Audience *</Label>
                  <Textarea
                    id="audience"
                    required
                    value={formData.audience_description}
                    onChange={(e) => setFormData({ ...formData, audience_description: e.target.value })}
                    placeholder="Who are your followers/clients? (e.g., Amazon sellers, eCommerce entrepreneurs)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="methods">How Will You Promote Auren? *</Label>
                  <Textarea
                    id="methods"
                    required
                    value={formData.promotional_methods}
                    onChange={(e) => setFormData({ ...formData, promotional_methods: e.target.value })}
                    placeholder="Social media, blog posts, YouTube, email list, etc."
                  />
                </div>
                
                  <Button type="submit" className="w-full bg-gradient-primary hover-scale group relative overflow-hidden shadow-lg shadow-primary/50">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      Submit Application
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="relative group border-accent/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
              <CardHeader className="relative">
                <div className="p-3 w-fit rounded-2xl bg-gradient-to-r from-accent to-primary shadow-lg shadow-accent/50 animate-glow-pulse mb-4" style={{ animationDelay: '0.5s' }}>
                  <Award className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Commission Tiers</CardTitle>
                <CardDescription>Earn more as you grow</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 transition-all hover-scale">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
                    Starter (1-5 referrals/month)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">20% recurring commission</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border border-accent/20 hover:border-accent/40 transition-all hover-scale">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
                    Growth (6-20 referrals/month)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">25% recurring commission + $100 per 10 referrals</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/15 via-accent/10 to-transparent border-2 border-primary/30 hover:border-primary/50 transition-all hover-scale">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-primary animate-glow-pulse" />
                    Pro (21+ referrals/month)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">30% recurring commission + co-branding & dedicated support</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const activeReferrals = referrals.filter(r => r.status === 'active');
  const totalMRR = activeReferrals.reduce((sum, r) => sum + (Number(r.subscription_amount) || 0), 0);
  const monthlyCommission = totalMRR * (affiliate.commission_rate / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[140px] animate-float" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-glow-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border border-primary/30 mb-4 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Affiliate Portal
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              Auren Partners
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-4">Track your affiliate performance and earnings</p>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
              affiliate.status === 'approved' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : affiliate.status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {affiliate.status.toUpperCase()}
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/30 backdrop-blur-sm">
              {affiliate.tier.toUpperCase()} • {affiliate.commission_rate}% commission
            </span>
          </div>
        </div>

        {affiliate.status === 'approved' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="relative group border-primary/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-glow-pulse" />
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{affiliate.total_referrals}</div>
                  <p className="text-xs text-muted-foreground mt-1">{affiliate.monthly_referrals} this month</p>
                </CardContent>
              </Card>

              <Card className="relative group border-accent/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '0.5s' }} />
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly MRR</CardTitle>
                  <div className="p-2 rounded-lg bg-accent/10">
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">${totalMRR.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From active referrals</p>
                </CardContent>
              </Card>

              <Card className="relative group border-primary/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Commission</CardTitle>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">${monthlyCommission.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Estimated monthly</p>
                </CardContent>
              </Card>

              <Card className="relative group border-accent/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 hover-scale">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                  <div className="p-2 rounded-lg bg-accent/10">
                    <DollarSign className="h-4 w-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">${affiliate.total_commission_earned}</div>
                  <p className="text-xs text-muted-foreground mt-1">${affiliate.pending_commission} pending</p>
                </CardContent>
              </Card>
            </div>

            {/* Affiliate Link */}
            <Card className="relative group border-primary/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
              <CardHeader className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-primary shadow-lg shadow-primary/30 animate-glow-pulse">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your Affiliate Link</CardTitle>
                </div>
                <CardDescription>Share this link to earn commissions</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex gap-3">
                  <div className="flex-1 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl font-mono text-sm border border-primary/20 backdrop-blur-sm">
                    {`${window.location.origin}/?aff=${affiliate.affiliate_code}`}
                  </div>
                  <Button onClick={copyAffiliateLink} className="bg-gradient-primary hover-scale group relative overflow-hidden shadow-lg shadow-primary/50">
                    <span className="relative z-10 flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Referrals */}
            <Card className="relative group border-accent/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity" />
              <CardHeader className="relative">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Recent Referrals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {referrals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No referrals yet. Start sharing your link!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {referrals.slice(0, 10).map((referral, idx) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/30 transition-all hover-scale backdrop-blur-sm" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div>
                          <p className="font-semibold text-lg">${referral.subscription_amount}/mo</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Commission: ${referral.commission_amount}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                            referral.status === 'active' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {referral.status}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payouts */}
            <Card className="relative group border-primary/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50 group-hover:opacity-70 transition-opacity" />
              <CardHeader className="relative">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Payout History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payouts yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payouts.map((payout, idx) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-accent/10 hover:border-accent/30 transition-all hover-scale backdrop-blur-sm" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div>
                          <p className="font-semibold text-lg">${payout.amount}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.payment_method.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                            payout.payment_status === 'paid' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {payout.payment_status}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {affiliate.status === 'pending' && (
          <Card className="relative group border-accent/20 bg-card/50 backdrop-blur-xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 opacity-70" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-glow-pulse" />
            <CardContent className="relative py-12 text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 mb-4 animate-glow-pulse">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Your application is under review. We'll notify you once it's approved!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}