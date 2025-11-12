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
  trialUsers: number;
  activeSubscriptions: number;
  discountAmount: string;
  duration: string;
  createdBy?: string;
  status?: string;
}

export function AdminCodeTracking() {
  const [codes, setCodes] = useState<CodeUsage[]>([]);
  const [allCodes, setAllCodes] = useState<CodeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalUses: 0,
    trialUsers: 0,
    activeConversions: 0,
    conversionRate: 0,
  });
  const [newCode, setNewCode] = useState({
    code: '',
    discountPercentage: 10,
    durationMonths: 3,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'referral' | 'affiliate' | 'custom'>('all');

  useEffect(() => {
    fetchCodeTracking();
  }, []);

  // Apply filter when filterType changes
  useEffect(() => {
    if (filterType === 'all') {
      setCodes(allCodes);
    } else {
      setCodes(allCodes.filter(code => code.type === filterType));
    }
  }, [filterType, allCodes]);

  const fetchCodeTracking = async () => {
    try {
      setIsLoading(true);

      // Fetch all codes from unified referral_codes table
      const { data: allCodes, error: codesError } = await supabase
        .from("referral_codes")
        .select("*");

      if (codesError) throw codesError;

      // Fetch usage data from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("referral_code, stripe_customer_id, email, created_at");

      if (profilesError) throw profilesError;

      // Consider users with stripe_customer_id as active subscribers
      const activeSubscriptionEmails = new Set(
        profiles?.filter(p => p.stripe_customer_id).map(p => p.email) || []
      );

      // Process all codes from unified table
      const codeUsageData: CodeUsage[] = allCodes?.map((codeData) => {
        const code = codeData.code.toUpperCase();
        const usageCount = profiles?.filter(
          (p) => p.referral_code?.toUpperCase() === code
        ).length || 0;
        const activeCount = profiles?.filter(
          (p) =>
            p.referral_code?.toUpperCase() === code && 
            p.email && 
            activeSubscriptionEmails.has(p.email)
        ).length || 0;
        
        const trialCount = usageCount - activeCount;

        // Map code_type to correct type
        const typeMap: Record<string, 'referral' | 'affiliate' | 'custom'> = {
          user: 'referral',
          affiliate: 'affiliate',
          custom: 'custom',
        };

        return {
          id: codeData.id,
          code,
          type: typeMap[codeData.code_type] || 'custom',
          totalUses: usageCount,
          trialUsers: trialCount,
          activeSubscriptions: activeCount,
          discountAmount: `${codeData.discount_percentage}% off`,
          duration: `${codeData.duration_months} months`,
        };
      }) || [];

      const allCodesData = codeUsageData;

      // Calculate stats
      const totalUses = allCodesData.reduce((sum, code) => sum + code.totalUses, 0);
      const totalTrialUsers = allCodesData.reduce((sum, code) => sum + code.trialUsers, 0);
      const activeConversions = allCodesData.reduce((sum, code) => sum + code.activeSubscriptions, 0);
      
      setAllCodes(allCodesData);
      setCodes(allCodesData);
      setStats({
        totalCodes: allCodesData.length,
        totalUses,
        trialUsers: totalTrialUsers,
        activeConversions,
        conversionRate: totalUses > 0 ? Math.round((activeConversions / totalUses) * 100) : 0,
      });
      
      setIsLoading(false);
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
        .from('referral_codes')
        .insert({
          code: newCode.code.toUpperCase().trim(),
          code_type: 'custom',
          discount_percentage: newCode.discountPercentage,
          duration_months: newCode.durationMonths,
          is_active: true,
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
    if (!confirm(`Are you sure you want to delete the code "${codeName}"?\n\nNote: Users who already used this code will keep their existing discounts. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('referral_codes')
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Users className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.trialUsers}</div>
            <p className="text-xs text-muted-foreground">Still on trial or churned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeConversions}</div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Code Usage Details</CardTitle>
              <CardDescription>All referral and affiliate codes with usage statistics</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter" className="text-sm">Filter by:</Label>
              <select
                id="filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'referral' | 'affiliate' | 'custom')}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="all">All Codes</option>
                <option value="referral">User Referrals</option>
                <option value="affiliate">Affiliates</option>
                <option value="custom">Custom Codes</option>
              </select>
            </div>
          </div>
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
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{code.totalUses}</p>
                        <p className="text-xs text-muted-foreground">Total Uses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-600">{code.trialUsers}</p>
                        <p className="text-xs text-muted-foreground">Trial Users</p>
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
                      {code.id && (
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
