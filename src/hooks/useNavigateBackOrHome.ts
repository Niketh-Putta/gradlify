import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { navigateBackOrHome } from "@/lib/navigation";

/** Back navigation that falls back to home when the page was opened directly (no history). */
export function useNavigateBackOrHome() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      navigateBackOrHome(navigate, location, Boolean(session));
    })();
  }, [location, navigate]);
}
