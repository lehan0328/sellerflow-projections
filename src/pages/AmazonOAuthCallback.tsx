import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const AmazonOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Amazon authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const spapi_oauth_code = searchParams.get('spapi_oauth_code');
        const state = searchParams.get('state');
        const selling_partner_id = searchParams.get('selling_partner_id');
        
        // Check for errors
        const error = searchParams.get('error');
        const error_description = searchParams.get('error_description');
        
        if (error) {
          throw new Error(error_description || error);
        }

        if (!spapi_oauth_code) {
          throw new Error('No authorization code received from Amazon');
        }

        console.log('Amazon OAuth callback received:', {
          hasCode: !!spapi_oauth_code,
          state,
          selling_partner_id
        });

        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('You must be logged in to connect Amazon');
        }

        console.log('Calling exchange-amazon-token with:', {
          code: spapi_oauth_code?.substring(0, 10) + '...',
          selling_partner_id,
          marketplace_id: state,
        });

        // Exchange the authorization code for access/refresh tokens
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke('exchange-amazon-token', {
          body: {
            code: spapi_oauth_code,
            selling_partner_id: selling_partner_id,
            marketplace_id: state, // State should contain marketplace_id
            account_name: `Amazon Store - ${selling_partner_id.slice(0, 8)}`
          }
        });

        console.log('Exchange response:', { exchangeData, exchangeError });

        if (exchangeError || !exchangeData?.success) {
          console.error('Exchange failed:', { exchangeError, exchangeData });
          throw new Error(exchangeError?.message || exchangeData?.error || 'Failed to connect Amazon account');
        }
        
        setStatus('success');
        setMessage('Amazon account connected successfully!');
        
        toast({
          title: "Success",
          description: "Your Amazon seller account has been connected.",
        });

        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings');
        }, 2000);

      } catch (error) {
        console.error('Amazon OAuth error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect Amazon account');
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to connect Amazon account',
          variant: "destructive",
        });

        // Redirect to settings after 3 seconds
        setTimeout(() => {
          navigate('/settings');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <h2 className="text-2xl font-bold text-slate-900">Connecting Amazon</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600" />
              <h2 className="text-2xl font-bold text-slate-900">Success!</h2>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-600" />
              <h2 className="text-2xl font-bold text-slate-900">Connection Failed</h2>
            </>
          )}
          
          <p className="text-slate-600">{message}</p>
          
          {status !== 'processing' && (
            <p className="text-sm text-slate-500">Redirecting you back...</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AmazonOAuthCallback;
