import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift, TrendingUp, Users } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { LoadingScreen } from "@/components/LoadingScreen";

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

  if (loading) {
    return <LoadingScreen message="Loading referral dashboard..." />;
  }

  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const currentTier = REWARD_TIERS.find((tier, index) => {
    const nextTier = REWARD_TIERS[index + 1];
    return activeReferrals >= tier.referrals && (!nextTier || activeReferrals < nextTier.referrals);
  }) || REWARD_TIERS[0];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Auren Rewards</h1>
          <p className="text-muted-foreground">Refer friends and earn amazing rewards!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {referrals.length - activeReferrals} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Reward</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentTier.special || `${currentTier.discount}% off`}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentTier.bonus > 0 && `+ $${currentTier.bonus} bonus`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${rewards?.total_cash_earned || 0}
              </div>
              <p className="text-xs text-muted-foreground">Cash bonuses earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
            <CardDescription>Share this link with fellow Amazon sellers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {`${window.location.origin}/?ref=${referralCode}`}
              </div>
              <Button onClick={copyReferralLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <Card>
          <CardHeader>
            <CardTitle>Reward Tiers</CardTitle>
            <CardDescription>Unlock bigger rewards as you refer more users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {REWARD_TIERS.map((tier, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${activeReferrals >= tier.referrals ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {tier.referrals} Referral{tier.referrals > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tier.special || `${tier.discount}% off next ${tier.duration} months`}
                        {tier.bonus > 0 && ` + $${tier.bonus} cash`}
                      </p>
                    </div>
                    {activeReferrals >= tier.referrals && (
                      <div className="text-primary font-medium">✓ Unlocked</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
            <CardDescription>Track your referral conversions</CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No referrals yet. Start sharing your link!
              </p>
            ) : (
              <div className="space-y-2">
                {referrals.slice(0, 10).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Referral</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      referral.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
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