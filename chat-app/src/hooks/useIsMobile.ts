"use client";

import { useState, useEffect } from "react";

/**
 * Returns true when the viewport width is below the `md` breakpoint (768 px).
 * Matches the existing hook from the Vite UI kit.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
