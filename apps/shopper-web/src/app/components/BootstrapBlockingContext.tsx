import { createContext, useContext, useMemo } from "react";

type BootstrapBlockingContextValue = {
  isBlocking: boolean;
};

const BootstrapBlockingContext = createContext<BootstrapBlockingContextValue>({
  isBlocking: false,
});

export function BootstrapBlockingProvider({
  isBlocking,
  children,
}: {
  isBlocking: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ isBlocking }), [isBlocking]);
  return <BootstrapBlockingContext.Provider value={value}>{children}</BootstrapBlockingContext.Provider>;
}

export function useBootstrapBlocking() {
  return useContext(BootstrapBlockingContext).isBlocking;
}

