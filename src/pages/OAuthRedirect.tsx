import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function OAuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Get the OAuth state ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    const oauthStateId = params.get('oauth_state_id');

    if (oauthStateId) {
      // Store the full redirect URI in sessionStorage for Plaid Link
      const receivedRedirectUri = window.location.href;
      sessionStorage.setItem('plaid_oauth_redirect_uri', receivedRedirectUri);
      
      // Navigate to onboarding (where the Plaid flow was initiated)
      navigate('/onboarding', { replace: true });
    } else {
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
