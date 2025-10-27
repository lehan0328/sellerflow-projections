import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const SignUp = () => {
  const navigate = useNavigate();
  
  // Temporarily redirect to signups closed page
  useEffect(() => {
    navigate('/signups-closed');
  }, [navigate]);

  return null;
};
