type DataFastWindow = Window & {
  datafast?: {
    visitorId?: string;
    sessionId?: string;
  };
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

/** Pass DataFast attribution IDs into Stripe checkout metadata when available. */
export const getDataFastIds = () => {
  if (typeof window === "undefined") return {};

  const datafast = (window as DataFastWindow).datafast;
  const datafast_visitor_id =
    datafast?.visitorId ?? readCookie("datafast_visitor_id") ?? readCookie("_df_visitor_id");
  const datafast_session_id =
    datafast?.sessionId ?? readCookie("datafast_session_id") ?? readCookie("_df_session_id");

  return {
    ...(datafast_visitor_id ? { datafast_visitor_id } : {}),
    ...(datafast_session_id ? { datafast_session_id } : {}),
  };
};
