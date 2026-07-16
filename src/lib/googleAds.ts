type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const GOOGLE_ADS_ID = "AW-18325194310";
const SIGNUP_SEND_TO = "AW-18325194310/560aCMek9NAcEMaMkaJE";

const getGtag = () => {
  if (typeof window === "undefined") return undefined;
  return (window as GtagWindow).gtag;
};

/** Fire Google Ads Sign-up conversion (once per browser session). */
export const trackGoogleAdsSignup = () => {
  const gtag = getGtag();
  if (!gtag) return;

  try {
    const key = "gradlify_gads_signup";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage may be unavailable; still attempt the event
  }

  gtag("event", "conversion", {
    send_to: SIGNUP_SEND_TO,
  });
};

export const GOOGLE_ADS_TAG_ID = GOOGLE_ADS_ID;
