import { useEffect, useState } from "react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, CreditCard, Building2, ShoppingCart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

interface LimitEnforcementModalProps {
  open: boolean;
  onClose: () => void;
  limitType: 'bank_connection' | 'amazon_connection' | 'user';
  currentUsage: number;
  limit: number;
}

export const LimitEnforcementModal = ({ 
  open,
  onClose,
  limitType,
  currentUsage,
  limit 
}: LimitEnforcementModalProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subscription = useSubscription();
  const { accounts: bankAccounts, refetch: refetchBankAccounts } = useBankAccounts();
  const { creditCards, refetch: refetchCreditCards } = useCreditCards();
  const { amazonAccounts, refetch: refetchAmazonAccounts } = useAmazonAccounts();
  const [isDeleting, setIsDeleting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const excess = currentUsage - limit;
  const isProfessionalTier = subscription.plan === 'professional';

  // Auto-close when back within limits
  useEffect(() => {
    if (open && currentUsage <= limit) {
      onClose();
    }
  }, [open, currentUsage, limit, onClose]);

  useEffect(() => {
    if (limitType === 'user' && open) {
      // Fetch team members (excluding current user)
      const fetchTeamMembers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('user_roles')
          .select('user_id, role, created_at')
          .neq('user_id', user.id);

        if (data) {
          // Get user details from profiles
          const userIds = data.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);

          const membersWithProfiles = data.map(role => {
            const profile = profiles?.find(p => p.user_id === role.user_id);
            return {
              ...role,
              name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User'
            };
          });

          setTeamMembers(membersWithProfiles);
        }
      };
      fetchTeamMembers();
    }
  }, [limitType, open]);

  const handleDeleteBankAccount = async (accountId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Bank account deleted successfully');
      await refetchBankAccounts();
      queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
    } catch (error: any) {
      toast.error('Failed to delete bank account: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCreditCard = async (cardId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast.success('Credit card deleted successfully');
      await refetchCreditCards();
      queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
    } catch (error: any) {
      toast.error('Failed to delete credit card: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAmazonAccount = async (accountId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('amazon_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Amazon account deleted successfully');
      await refetchAmazonAccounts();
      queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
    } catch (error: any) {
      toast.error('Failed to delete Amazon account: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Team member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
      
      // Refresh team members list
      setTeamMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (error: any) {
      toast.error('Failed to remove team member: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePurchaseAddon = () => {
    navigate('/upgrade-plan');
  };

  const getContent = () => {
    switch (limitType) {
      case 'bank_connection':
        const allFinancialConnections = [
          ...bankAccounts.map(acc => ({ ...acc, itemType: 'bank' })),
          ...creditCards.map(card => ({ ...card, itemType: 'credit' }))
        ];
        return {
          title: 'Financial Connection Limit Exceeded',
          icon: <Building2 className="h-5 w-5" />,
          description: `You have ${currentUsage} financial connections but your plan allows only ${limit}. Delete ${excess} connection(s) or purchase add-ons.`,
          items: allFinancialConnections.map(item => ({
            id: item.id,
            name: item.account_name,
            subtitle: item.institution_name,
            type: item.itemType,
            onDelete: item.itemType === 'credit' ? handleDeleteCreditCard : handleDeleteBankAccount
          }))
        };
      
      case 'amazon_connection':
        return {
          title: 'Amazon Connection Limit Exceeded',
          icon: <ShoppingCart className="h-5 w-5" />,
          description: `You have ${currentUsage} Amazon connections but your plan allows only ${limit}. Delete ${excess} connection(s) or purchase add-ons.`,
          items: amazonAccounts.map(account => ({
            id: account.id,
            name: account.account_name,
            subtitle: account.marketplace_name,
            type: 'amazon',
            onDelete: handleDeleteAmazonAccount
          }))
        };
      
      case 'user':
        return {
          title: 'Team Member Limit Exceeded',
          icon: <Users className="h-5 w-5" />,
          description: `You have ${currentUsage} team members but your plan allows only ${limit}. Remove ${excess} member(s) or purchase add-ons.`,
          items: teamMembers.map(member => ({
            id: member.user_id,
            name: member.name,
            subtitle: member.role,
            type: 'team_member',
            onDelete: handleRemoveTeamMember
          }))
        };
    }
  };

  const content = getContent();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && currentUsage <= limit && onClose()}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
        >
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>{content.title}</DialogTitle>
            </div>
            <DialogDescription>
              {isProfessionalTier ? (
                <>You're on the Professional tier and have reached your limit. To add more, you'll need to purchase add-ons or contact us for an Enterprise plan.</>
              ) : (
                content.description
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status */}
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Usage</span>
                <Badge variant="destructive">{currentUsage} / {limit}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                You must reduce usage by {excess} or purchase add-ons to continue.
              </p>
            </div>

            {/* List of Items */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                {limitType === 'user' ? 'Team Members' : limitType === 'amazon_connection' ? 'Amazon Connections' : 'Financial Connections'}
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {content.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {limitType === 'bank_connection' && (
                        item.type === 'credit_card' ? 
                          <CreditCard className="h-4 w-4 text-muted-foreground" /> : 
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      {limitType === 'amazon_connection' && <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                      {limitType === 'user' && <Users className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => item.onDelete(item.id)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handlePurchaseAddon}
                className="flex-1"
              >
                Purchase Add-ons
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
