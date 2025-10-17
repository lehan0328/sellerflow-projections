import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserPlus, Award, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";

interface Affiliate {
  id: string;
  user_id: string;
  user_email: string;
  affiliate_code: string;
  status: string;
  commission_rate: number;
  total_referrals: number;
  trial_referrals: number;
  paid_referrals: number;
  churned_referrals: number;
  monthly_referrals: number;
  total_commission_earned: number;
  pending_commission: number;
  tier: string;
  company_name: string | null;
  website: string | null;
  follower_count: number | null;
  created_at: string;
  approved_at: string | null;
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    affiliateCode: "",
  });

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);

      // Fetch all affiliates
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });

      if (affiliatesError) throw affiliatesError;

      // Fetch user profiles to get emails
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name");

      if (profilesError) throw profilesError;

      // Fetch affiliate referrals count
      const { data: referralsData, error: referralsError } = await supabase
        .from("affiliate_referrals")
        .select("affiliate_id, status");

      if (referralsError) throw referralsError;

      // Aggregate data
      const referralMap = new Map<string, { total: number; active: number }>();
      referralsData?.forEach((ref) => {
        const current = referralMap.get(ref.affiliate_id) || { total: 0, active: 0 };
        current.total++;
        if (ref.status === "active") current.active++;
        referralMap.set(ref.affiliate_id, current);
      });

      const combinedData: Affiliate[] = affiliatesData?.map((affiliate) => {
        const profile = profiles?.find((p) => p.user_id === affiliate.user_id);
        const refCount = referralMap.get(affiliate.id) || { total: 0, active: 0 };
        
        const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

        return {
          id: affiliate.id,
          user_id: affiliate.user_id,
          user_email: fullName || affiliate.user_id.slice(0, 8) + "...",
          affiliate_code: affiliate.affiliate_code,
          status: affiliate.status,
          commission_rate: affiliate.commission_rate,
          total_referrals: refCount.total,
          trial_referrals: affiliate.trial_referrals || 0,
          paid_referrals: affiliate.paid_referrals || 0,
          churned_referrals: affiliate.churned_referrals || 0,
          monthly_referrals: affiliate.monthly_referrals || 0,
          total_commission_earned: affiliate.total_commission_earned || 0,
          pending_commission: affiliate.pending_commission || 0,
          tier: affiliate.tier,
          company_name: affiliate.company_name,
          website: affiliate.website,
          follower_count: affiliate.follower_count,
          created_at: affiliate.created_at,
          approved_at: affiliate.approved_at,
        };
      }) || [];

      setAffiliates(combinedData);
    } catch (error: any) {
      console.error("Error fetching affiliates:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = async () => {
    try {
      setIsCreating(true);

      // Get user ID from profiles table by matching first/last name or using the email as a user_id if it's a UUID
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name");

      if (profileError) throw profileError;

      // Try to find user by matching the email input to their name or user_id
      const matchingProfile = profiles?.find((p) => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
        return fullName === formData.email.toLowerCase() || p.user_id === formData.email;
      });

      if (!matchingProfile) {
        throw new Error("User not found. Please enter their full name or user ID.");
      }

      // Create affiliate with starter tier (15% commission)
      const { error: affiliateError } = await supabase
        .from("affiliates")
        .insert({
          user_id: matchingProfile.user_id,
          affiliate_code: formData.affiliateCode.toUpperCase(),
          tier: "starter",
          commission_rate: 15,
          status: "approved",
          approved_at: new Date().toISOString(),
        });

      if (affiliateError) throw affiliateError;

      toast({
        title: "Success",
        description: "Affiliate created successfully",
      });

      setIsCreateOpen(false);
      setFormData({
        email: "",
        affiliateCode: "",
      });
      fetchAffiliates();
    } catch (error: any) {
      console.error("Error creating affiliate:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateAffiliateStatus = async (affiliateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ 
          status: newStatus,
          approved_at: newStatus === "approved" ? new Date().toISOString() : null
        })
        .eq("id", affiliateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Affiliate ${newStatus}`,
      });

      fetchAffiliates();
    } catch (error: any) {
      console.error("Error updating affiliate:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading affiliates..." />;
  }

  const stats = {
    totalAffiliates: affiliates.length,
    activeAffiliates: affiliates.filter((a) => a.status === "approved").length,
    totalCommissionPaid: affiliates.reduce((sum, a) => sum + Number(a.total_commission_earned), 0),
    pendingCommission: affiliates.reduce((sum, a) => sum + Number(a.pending_commission), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">{stats.activeAffiliates} active</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.reduce((sum, a) => sum + a.total_referrals, 0)}
            </div>
            <p className="text-xs text-muted-foreground">All affiliate referrals</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCommissionPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total paid out</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commission</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pendingCommission.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Affiliate Partners</CardTitle>
              <CardDescription>Manage affiliate codes and partnerships</CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Affiliate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Affiliate</DialogTitle>
                  <DialogDescription>
                    Link a user account to an affiliate code. Tier will be automatically tracked based on referrals.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">User Name or ID *</Label>
                    <Input
                      id="email"
                      placeholder="John Doe or user_id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the user's full name or their user ID
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Affiliate Code *</Label>
                    <Input
                      id="code"
                      placeholder="PARTNERCODE"
                      value={formData.affiliateCode}
                      onChange={(e) => setFormData({ ...formData, affiliateCode: e.target.value.toUpperCase() })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique code for tracking referrals
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAffiliate} disabled={isCreating || !formData.email || !formData.affiliateCode}>
                      {isCreating ? "Creating..." : "Create Affiliate"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Commission</TableHead>
                <TableHead className="text-center">Trial</TableHead>
                <TableHead className="text-center">Paid</TableHead>
                <TableHead className="text-center">Churned</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No affiliates yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                affiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">{affiliate.user_email}</TableCell>
                    <TableCell className="font-mono text-sm">{affiliate.affiliate_code}</TableCell>
                    <TableCell className="text-sm">{affiliate.company_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {affiliate.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          affiliate.status === "approved"
                            ? "default"
                            : affiliate.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {affiliate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{affiliate.commission_rate}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{affiliate.trial_referrals}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{affiliate.paid_referrals}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{affiliate.churned_referrals}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{affiliate.total_referrals}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${affiliate.total_commission_earned.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {affiliate.pending_commission > 0 ? (
                        <span className="font-semibold text-yellow-600">
                          ${affiliate.pending_commission.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {affiliate.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAffiliateStatus(affiliate.id, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {affiliate.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAffiliateStatus(affiliate.id, "suspended")}
                        >
                          Suspend
                        </Button>
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
