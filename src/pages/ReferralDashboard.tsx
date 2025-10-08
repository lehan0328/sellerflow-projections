import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift, TrendingUp, Users, ArrowLeft, Sparkles, Target } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";

const REWARD_TIERS = [
  { referrals: 1, discount: 15, bonus: 0, duration: 3 },
  { referrals: 2, discount: 20, bonus: 0, duration: 3 },
  { referrals: 5, discount: 25, bonus: 50, duration: 3 },
  { referrals: 10, discount: 30, bonus: 100, duration: 3 },
  { referrals: 20, discount: 40, bonus: 200, duration: 3 },
  { referrals: 50, discount: 50, bonus: 1000, duration: 3 },
  { referrals: 100, discount: 0, bonus: 3000, duration: 6, special: "Free for 6 months" },
];

export default function ReferralDashboard() {
  const { loading, referralCode, referrals, rewards, copyReferralLink } = useReferrals();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingScreen message="Loading referral dashboard..." />;
  }

  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const currentTier = REWARD_TIERS.find((tier, index) => {
    const nextTier = REWARD_TIERS[index + 1];
    return activeReferrals >= tier.referrals && (!nextTier || activeReferrals < nextTier.referrals);
  }) || REWARD_TIERS[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 hover-scale"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <Gift className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Auren Rewards
              </h1>
              <p className="text-muted-foreground mt-1">Refer friends and earn amazing rewards!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">{/* Partners Highlight Banner */}
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 backdrop-blur">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/30 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-radial from-accent/30 to-transparent blur-3xl" />
          <CardContent className="relative p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-primary animate-glow-pulse">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Earn Up To $3,000!</h3>
                  <p className="text-muted-foreground">
                    Reach 100 referrals and unlock 6 months free + $3,000 cash bonus
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate('/partners')}
                className="bg-gradient-primary hover-scale group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  View All Rewards
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                {activeReferrals}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {referrals.length - activeReferrals} pending
              </p>
            </CardContent>
          </Card>

          <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Reward</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Gift className="h-4 w-4 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                {currentTier.special || `${currentTier.discount}% off`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentTier.bonus > 0 && `+ $${currentTier.bonus} bonus`}
              </p>
            </CardContent>
          </Card>

          <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                ${rewards?.total_cash_earned || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cash bonuses earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/5 backdrop-blur">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/20 to-transparent blur-2xl" />
          <CardHeader className="relative">
            <CardTitle className="text-xl">Your Referral Link</CardTitle>
            <CardDescription>Share this link with fellow Amazon sellers</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-4 bg-muted/50 backdrop-blur rounded-lg border border-primary/20 font-mono text-sm overflow-x-auto">
                {`${window.location.origin}/?ref=${referralCode}`}
              </div>
              <Button onClick={copyReferralLink} className="bg-gradient-primary hover-scale">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Reward Tiers</CardTitle>
            <CardDescription>Unlock bigger rewards as you refer more users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {REWARD_TIERS.map((tier, index) => {
                const isUnlocked = activeReferrals >= tier.referrals;
                const isHighValue = tier.bonus >= 1000;
                return (
                  <div 
                    key={index}
                    className={`relative p-5 rounded-xl border transition-all duration-300 hover-scale ${
                      isUnlocked 
                        ? 'border-primary bg-gradient-to-r from-primary/10 to-accent/10 shadow-lg shadow-primary/10' 
                        : 'border-border/50 bg-card/50'
                    } ${isHighValue ? 'ring-2 ring-primary/50' : ''}`}
                  >
                    {isHighValue && (
                      <div className="absolute top-2 right-2">
                        <div className="px-2 py-1 rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                          TOP TIER
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-2 w-2 rounded-full ${isUnlocked ? 'bg-primary animate-glow-pulse' : 'bg-muted'}`} />
                          <p className="font-semibold text-lg">
                            {tier.referrals} Referral{tier.referrals > 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground ml-4">
                          {tier.special || `${tier.discount}% off next ${tier.duration} months`}
                          {tier.bonus > 0 && (
                            <span className="ml-1 font-semibold text-primary">
                              + ${tier.bonus.toLocaleString()} cash
                            </span>
                          )}
                        </p>
                      </div>
                      {isUnlocked && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-primary">
                          <span className="text-sm font-bold text-primary-foreground">✓ Unlocked</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Recent Referrals</CardTitle>
            <CardDescription>Track your referral conversions</CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No referrals yet. Start sharing your link!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 10).map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        referral.status === 'active' 
                          ? 'bg-gradient-to-br from-green-500/20 to-green-600/20' 
                          : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20'
                      }`}>
                        <Users className={`h-5 w-5 ${
                          referral.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">Referral</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      referral.status === 'active' 
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                    }`}>
                      {referral.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}