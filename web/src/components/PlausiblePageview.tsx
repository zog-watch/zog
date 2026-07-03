import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { trackPlausiblePageview } from "@/setup/plausible";

export function PlausiblePageview() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPlausiblePageview(path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
