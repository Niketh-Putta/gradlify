import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AIUnavailableRedirect({ to = "/home" }: { to?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    toast.message("This feature is currently unavailable while we focus on core practice and competition.");
    navigate(to, { replace: true });
  }, [navigate, to]);

  return null;
}
