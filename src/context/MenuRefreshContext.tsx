import { createContext, useContext, useRef, type ReactNode } from 'react';

type RefreshCallback = () => void;

interface MenuRefreshContextValue {
  subscribe: (cb: RefreshCallback) => () => void;
  trigger: () => void;
}

const MenuRefreshContext = createContext<MenuRefreshContextValue>({
  subscribe: () => () => {},
  trigger: () => {},
});

export function MenuRefreshProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Set<RefreshCallback>>(new Set());

  const subscribe = useRef((cb: RefreshCallback) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }).current;

  const trigger = useRef(() => {
    listenersRef.current.forEach((cb) => cb());
  }).current;

  return (
    <MenuRefreshContext.Provider value={{ subscribe, trigger }}>
      {children}
    </MenuRefreshContext.Provider>
  );
}

export function useMenuRefresh() {
  return useContext(MenuRefreshContext);
}
