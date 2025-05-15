
"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to a consistent value for SSR, e.g., false (desktop).
  // This ensures server and initial client render match.
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // This effect only runs on the client.
    if (typeof window !== "undefined") {
      const checkDevice = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      };

      checkDevice(); // Initial check on client mount
      window.addEventListener("resize", checkDevice);

      return () => {
        window.removeEventListener("resize", checkDevice);
      };
    }
  }, []); // Empty dependency array ensures this runs once on mount and only on client

  return isMobile;
}
