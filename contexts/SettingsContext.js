import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [showAddShortcut, setShowAddShortcut] = useState(true);
  const updateShowAddShortcut = useCallback(
    (enabled) => setShowAddShortcut(enabled),
    []
  );

  const value = useMemo(
    () => ({
      showAddShortcut,
      setShowAddShortcut: updateShowAddShortcut
    }),
    [showAddShortcut, updateShowAddShortcut]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
