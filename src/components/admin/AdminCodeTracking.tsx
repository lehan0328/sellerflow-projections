import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Users, TrendingUp, DollarSign, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CodeUsage {
  id?: string;
  code: string;
  type: 'referral' | 'affiliate' | 'custom';
  totalUses: number;
  activeSubscriptions: number;
  discountAmount: string;
  duration: string;
  createdBy?: string;
  status?: string;
}

export function AdminCodeTracking() {
  const [codes, setCodes] = useState<CodeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalUses: 0,
    activeConversions: 0,
    conversionRate: 0,
  });
  const [newCode, setNewCode] = useState({
    code: '',
    discountPercentage: 10,
    durationMonths: 3,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCodeTracking();
  }, []);

  const fetchCodeTracking = async () => {
    try {
      // Fetch all referral codes from profiles
      const { data: referralData } = await supabase
        .from('profiles')
        .select('referral_code, email')
        .not('referral_code', 'is', null)
        .neq('referral_code', '');

      // Fetch affiliate codes from affiliates table
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('affiliate_code, status, user_id');

      // Get subscription data to check active subscriptions
      const { data: subscriptionData } = await supabase.functions.invoke('get-admin-subscriptions', {
        body: {}
      });

      const activeSubscriptionEmails = new Set(
        subscriptionData?.subscriptions
          ?.filter((sub: any) => sub.status === 'active')
          .map((sub: any) => sub.customer_email) || []
      );

      // Count referral code usage
      const referralCounts = new Map<string, { total: number; active: number; emails: Set<string> }>();
      referralData?.forEach((profile) => {
        const code = profile.referral_code!.toUpperCase();
        if (!referralCounts.has(code)) {
          referralCounts.set(code, { total: 0, active: 0, emails: new Set() });
        }
        const stats = referralCounts.get(code)!;
        stats.total++;
        stats.emails.add(profile.email || '');
        if (profile.email && activeSubscriptionEmails.has(profile.email)) {
          stats.active++;
        }
      });

      // Process affiliate codes
      const affiliateCounts = new Map<string, { total: number; active: number; status: string; emails: Set<string> }>();
      
      for (const affiliate of affiliateData || []) {
        const code = affiliate.affiliate_code.toUpperCase();
        
        // Find users who signed up with this affiliate code
        const { data: affiliateUsers } = await supabase
          .from('affiliate_referrals')
          .select('referred_user_id, status');

        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('user_id', affiliateUsers?.map(u => u.referred_user_id) || []);

        const userEmails = new Set(userProfiles?.map(p => p.email || '') || []);
        const activeCount = Array.from(userEmails).filter(email => activeSubscriptionEmails.has(email)).length;

        affiliateCounts.set(code, {
          total: userEmails.size,
          active: activeCount,
          status: affiliate.status,
          emails: userEmails
        });
      }

      // Fetch custom admin codes
      const { data: customCodes } = await supabase
        .from('custom_discount_codes')
        .select('*')
        .eq('is_active', true);

      // Count usage for custom codes (check profiles table for referral_code matches)
      const customCodeUsage = new Map<string, { total: number; active: number; id: string; discount: number; duration: number }>();
      
      for (const customCode of customCodes || []) {
        const { data: usageData } = await supabase
          .from('profiles')
          .select('referral_code, stripe_customer_id')
          .eq('referral_code', customCode.code);

        const totalUses = usageData?.length || 0;
        const activeUses = usageData?.filter(p => p.stripe_customer_id).length || 0;

        customCodeUsage.set(customCode.code, {
          total: totalUses,
          active: activeUses,
          id: customCode.id,
          discount: customCode.discount_percentage,
          duration: customCode.duration_months,
        });
      }

      // Combine into CodeUsage array
      const allCodes: CodeUsage[] = [];

      // Add custom admin codes first
      customCodeUsage.forEach((stats, code) => {
        allCodes.push({
          id: stats.id,
          code,
          type: 'custom',
          totalUses: stats.total,
          activeSubscriptions: stats.active,
          discountAmount: `${stats.discount}% off`,
          duration: `${stats.duration} months`,
        });
      });

      // Add referral codes (only codes with actual usage)
      referralCounts.forEach((stats, code) => {
        if (stats.total > 0) {
          allCodes.push({
            code,
            type: 'referral',
            totalUses: stats.total,
            activeSubscriptions: stats.active,
            discountAmount: '10% off',
            duration: '3 months',
          });
        }
      });

      // Add affiliate codes (show all, even with 0 uses)
      affiliateCounts.forEach((stats, code) => {
        allCodes.push({
          code,
          type: 'affiliate',
          totalUses: stats.total,
          activeSubscriptions: stats.active,
          discountAmount: '10% off',
          duration: '3 months',
          status: stats.status,
        });
      });

      // Sort by total uses
      allCodes.sort((a, b) => b.totalUses - a.totalUses);

      setCodes(allCodes);

      // Calculate stats
      const totalUses = allCodes.reduce((sum, code) => sum + code.totalUses, 0);
      const activeConversions = allCodes.reduce((sum, code) => sum + code.activeSubscriptions, 0);
      
      setStats({
        totalCodes: allCodes.length,
        totalUses,
        activeConversions,
        conversionRate: totalUses > 0 ? Math.round((activeConversions / totalUses) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching code tracking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code.trim()) {
      toast.error('Please enter a code');
      return;
    }

    if (newCode.code.length < 3 || newCode.code.length > 20) {
      toast.error('Code must be between 3 and 20 characters');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('custom_discount_codes')
        .insert({
          code: newCode.code.toUpperCase().trim(),
          discount_percentage: newCode.discountPercentage,
          duration_months: newCode.durationMonths,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This code already exists');
        } else {
          toast.error('Failed to create code');
        }
        return;
      }

      toast.success('Code created successfully');
      setNewCode({ code: '', discountPercentage: 10, durationMonths: 3 });
      fetchCodeTracking();
    } catch (error) {
      console.error('Error creating code:', error);
      toast.error('Failed to create code');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Are you sure you want to delete the code "${codeName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_discount_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        toast.error('Failed to delete code');
        return;
      }

      toast.success('Code deleted successfully');
      fetchCodeTracking();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Failed to delete code');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Code Tracking</h2>
          <p className="text-muted-foreground">Track referral and affiliate code usage</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Code Tracking</h2>
        <p className="text-muted-foreground">
          Track referral and affiliate code usage and conversions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCodes}</div>
            <p className="text-xs text-muted-foreground">Active referral & affiliate codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUses}</div>
            <p className="text-xs text-muted-foreground">Times codes have been used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversions}</div>
            <p className="text-xs text-muted-foreground">Converted to paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Trial to paid conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Custom Code */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Discount Code</CardTitle>
          <CardDescription>Add a new custom code with custom discount percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="SAVE20"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={newCode.discountPercentage}
                onChange={(e) => setNewCode({ ...newCode, discountPercentage: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (months)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="12"
                value={newCode.durationMonths}
                onChange={(e) => setNewCode({ ...newCode, durationMonths: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleCreateCode} 
                disabled={isCreating}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Code'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Code Usage Details</CardTitle>
          <CardDescription>All referral and affiliate codes with usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {codes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No codes tracked yet</p>
            ) : (
              <div className="space-y-3">
                {codes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">{code.code}</span>
                        <Badge variant={code.type === 'custom' ? 'default' : code.type === 'affiliate' ? 'default' : 'secondary'}>
                          {code.type === 'custom' ? 'Custom Admin Code' : code.type === 'affiliate' ? 'Affiliate' : 'User Referral'}
                        </Badge>
                        {code.status && (
                          <Badge variant={code.status === 'approved' ? 'default' : 'outline'}>
                            {code.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {code.discountAmount} • {code.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{code.totalUses}</p>
                        <p className="text-xs text-muted-foreground">Total Uses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{code.activeSubscriptions}</p>
                        <p className="text-xs text-muted-foreground">Active Subs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {code.totalUses > 0 
                            ? `${Math.round((code.activeSubscriptions / code.totalUses) * 100)}%`
                            : '0%'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Conversion</p>
                      </div>
                      {code.type === 'custom' && code.id && (
                        <div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id!, code.code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
