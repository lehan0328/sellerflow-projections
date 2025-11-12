import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";

interface ReferralData {
  user_id: string;
  user_email: string;
  referral_code: string;
  code_created_at: string;
  total_referrals: number;
  active_referrals: number;
  tier_level: number;
  discount_percentage: number;
  cash_bonus: number;
  pending_cash_bonus: number;
  total_cash_earned: number;
  discount_end_date: string | null;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReferrals: 0,
    totalCashPaid: 0,
    pendingCash: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      // Fetch all profiles with user-owned referral codes
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, my_referral_code, referral_code, first_name, last_name, email, stripe_customer_id, created_at")
        .not("my_referral_code", "is", null);

      if (profilesError) throw profilesError;

      // For each code owner, count who used their code
      const combinedData: ReferralData[] = [];

      for (const owner of profiles || []) {
        const ownedCode = owner.my_referral_code!.toUpperCase();
        
        // Find all users who signed up with this code
        const { data: referrers } = await supabase
          .from("profiles")
          .select("user_id, referral_code, stripe_customer_id, email")
          .eq("referral_code", ownedCode);

        const totalReferrals = referrers?.length || 0;
        const activeReferrals = referrers?.filter(r => r.stripe_customer_id).length || 0;
        
        const fullName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();

        combinedData.push({
          user_id: owner.user_id,
          user_email: fullName || owner.email || owner.user_id.slice(0, 8) + "...",
          referral_code: ownedCode,
          code_created_at: owner.created_at || new Date().toISOString(),
          total_referrals: totalReferrals,
          active_referrals: activeReferrals,
          tier_level: 0,
          discount_percentage: 10,
          cash_bonus: 0,
          pending_cash_bonus: 0,
          total_cash_earned: 0,
          discount_end_date: null,
        });
      }

      setReferrals(combinedData.sort((a, b) => b.active_referrals - a.active_referrals));

      // Calculate stats
      const totalReferralsCount = combinedData.reduce((sum, r) => sum + r.total_referrals, 0);

      setStats({
        totalUsers: combinedData.length,
        totalReferrals: totalReferralsCount,
        totalCashPaid: 0,
        pendingCash: 0,
      });
    } catch (error: any) {
      console.error("Error fetching referral data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading referral data..." />;
  }

  const getTierName = (tier: number) => {
    const tiers = ["None", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite", "Legend"];
    return tiers[tier] || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">With referral codes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All referrals made</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Paid</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCashPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total bonuses paid</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Cash</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pendingCash.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting redemption</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Referrals</CardTitle>
          <CardDescription>Track all customer referral activity and rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Code Created</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Discount</TableHead>
                <TableHead className="text-right">Cash Earned</TableHead>
                <TableHead className="text-right">Pending Cash</TableHead>
                <TableHead>Discount Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No referral data available
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((ref) => (
                  <TableRow key={ref.user_id}>
                    <TableCell className="font-medium">{ref.user_email}</TableCell>
                    <TableCell className="font-mono text-sm">{ref.referral_code}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(ref.code_created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">{ref.total_referrals}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={ref.active_referrals > 0 ? "default" : "secondary"}>
                        {ref.active_referrals}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ref.tier_level >= 5 ? "border-primary text-primary" : ""}
                      >
                        {getTierName(ref.tier_level)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {ref.tier_level === 7 ? "100% (6mo)" : `${ref.discount_percentage}%`}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${ref.total_cash_earned.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {ref.pending_cash_bonus > 0 ? (
                        <span className="font-semibold text-yellow-600">
                          ${ref.pending_cash_bonus.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ref.discount_end_date ? (
                        <span className="text-sm">
                          {new Date(ref.discount_end_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}