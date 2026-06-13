import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'flowable-form-debug-enabled';

interface FormDebugContextValue {
  debug: boolean;
  toggle: () => boolean;
}

const FormDebugContext = createContext<FormDebugContextValue>({
  debug: false,
  toggle: () => false,
});

export function FormDebugProvider({ children }: { children: ReactNode }) {
  const [debug, setDebug] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  const toggle = useCallback(() => {
    const next = !debug;
    setDebug(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  }, [debug]);

  return (
    <FormDebugContext.Provider value={{ debug, toggle }}>
      {children}
    </FormDebugContext.Provider>
  );
}

export function useFormDebug() {
  return useContext(FormDebugContext);
}
