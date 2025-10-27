import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function OAuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('OAuth redirect - Full URL:', window.location.href);
    console.log('OAuth redirect - Search params:', window.location.search);
    
    // Get the OAuth state ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    const oauthStateId = params.get('oauth_state_id');

    console.log('OAuth state ID received:', oauthStateId);

    if (oauthStateId) {
      // Store the full redirect URI in sessionStorage for Plaid Link
      const receivedRedirectUri = window.location.href;
      sessionStorage.setItem('plaid_oauth_redirect_uri', receivedRedirectUri);
      console.log('Stored redirect URI:', receivedRedirectUri);
      
      // Navigate to onboarding (where the Plaid flow was initiated)
      navigate('/onboarding', { replace: true });
    } else {
      console.error('No OAuth state ID received in URL');
      // Still try to navigate back in case this is a different OAuth flow
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Completing connection...</h2>
        <p className="text-muted-foreground">Please wait while we finalize your bank connection.</p>
      </div>
    </div>
  );
}
