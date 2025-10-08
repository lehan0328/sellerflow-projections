import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, DollarSign, TrendingUp, Users } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useState } from "react";

export default function AffiliateDashboard() {
  const { loading, affiliate, referrals, payouts, applyAsAffiliate, copyAffiliateLink } = useAffiliates();
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Join Auren Partners</CardTitle>
              <CardDescription>Apply to become an Auren affiliate and earn recurring commissions</CardDescription>
            </CardHeader>
            <CardContent>
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
                
                <Button type="submit" className="w-full">Submit Application</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Commission Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold">Starter (1-5 referrals/month)</h3>
                  <p className="text-sm text-muted-foreground">20% recurring commission</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold">Growth (6-20 referrals/month)</h3>
                  <p className="text-sm text-muted-foreground">25% recurring commission + $100 per 10 referrals</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold">Pro (21+ referrals/month)</h3>
                  <p className="text-sm text-muted-foreground">30% recurring commission + co-branding & dedicated support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeReferrals = referrals.filter(r => r.status === 'active');
  const totalMRR = activeReferrals.reduce((sum, r) => sum + (Number(r.subscription_amount) || 0), 0);
  const monthlyCommission = totalMRR * (affiliate.commission_rate / 100);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Auren Partners Dashboard</h1>
          <p className="text-muted-foreground">Track your affiliate performance and earnings</p>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              affiliate.status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : affiliate.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {affiliate.status.toUpperCase()}
            </span>
            <span className="ml-3 text-sm text-muted-foreground">
              Tier: {affiliate.tier.toUpperCase()} ({affiliate.commission_rate}% commission)
            </span>
          </div>
        </div>

        {affiliate.status === 'approved' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{affiliate.total_referrals}</div>
                  <p className="text-xs text-muted-foreground">{affiliate.monthly_referrals} this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly MRR</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalMRR.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">From active referrals</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Commission</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${monthlyCommission.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Estimated monthly</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${affiliate.total_commission_earned}</div>
                  <p className="text-xs text-muted-foreground">${affiliate.pending_commission} pending</p>
                </CardContent>
              </Card>
            </div>

            {/* Affiliate Link */}
            <Card>
              <CardHeader>
                <CardTitle>Your Affiliate Link</CardTitle>
                <CardDescription>Share this link to earn commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                    {`${window.location.origin}/?aff=${affiliate.affiliate_code}`}
                  </div>
                  <Button onClick={copyAffiliateLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Referrals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Referrals</CardTitle>
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
                          <p className="font-medium">${referral.subscription_amount}/mo</p>
                          <p className="text-sm text-muted-foreground">
                            Commission: ${referral.commission_amount}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm ${
                            referral.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
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
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payouts yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">${payout.amount}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.payment_method.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm ${
                            payout.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
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
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Your application is under review. We'll notify you once it's approved!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}