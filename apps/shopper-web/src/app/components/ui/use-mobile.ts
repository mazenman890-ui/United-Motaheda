import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const SHOPPER_SHELL_BREAKPOINT = 1200;

function useBreakpointQuery(maxWidth: number) {
  const [matches, setMatches] = React.useState<boolean | undefined>(
    typeof window === "undefined" ? undefined : window.innerWidth < maxWidth,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const onChange = () => {
      setMatches(window.innerWidth < maxWidth);
    };
    mql.addEventListener("change", onChange);
    setMatches(window.innerWidth < maxWidth);
    return () => mql.removeEventListener("change", onChange);
  }, [maxWidth]);

  return !!matches;
}

export function useIsMobile() {
  return useBreakpointQuery(MOBILE_BREAKPOINT);
}

export function useIsShopperShell() {
  return useBreakpointQuery(SHOPPER_SHELL_BREAKPOINT);
}
