import type { Location, NavigateFunction } from "react-router-dom";
import { getDashboardPath } from "@/lib/track";

/** Public marketing / landing entry for signed-out users. */
export const LANDING_HOME_PATH = "/11-plus";

export function getHomePath(isAuthenticated: boolean): string {
  return isAuthenticated ? getDashboardPath() : LANDING_HOME_PATH;
}

/** Use browser back when possible; otherwise route to the app or landing home. */
export function navigateBackOrHome(
  navigate: NavigateFunction,
  location: Location,
  isAuthenticated: boolean,
): void {
  if (location.key !== "default") {
    navigate(-1);
    return;
  }
  navigate(getHomePath(isAuthenticated), { replace: true });
}
