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
      // Store the OAuth state ID in sessionStorage so Plaid Link can pick it up
      sessionStorage.setItem('plaid_oauth_state_id', oauthStateId);
      console.log('OAuth redirect received, state ID:', oauthStateId);
      
      // Redirect back to settings page where Plaid Link will handle the OAuth flow
      navigate('/settings', { replace: true });
    } else {
      console.error('No OAuth state ID received');
      navigate('/settings', { replace: true });
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
