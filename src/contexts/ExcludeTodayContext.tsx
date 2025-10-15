import React, { createContext, useContext, useState, useEffect } from 'react';

interface ExcludeTodayContextType {
  excludeToday: boolean;
  setExcludeToday: (value: boolean) => void;
}

const ExcludeTodayContext = createContext<ExcludeTodayContextType | undefined>(undefined);

export const ExcludeTodayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [excludeToday, setExcludeTodayState] = useState(() => {
    const saved = localStorage.getItem('exclude-today-transactions');
    return saved === 'true';
  });

  const setExcludeToday = (value: boolean) => {
    setExcludeTodayState(value);
    localStorage.setItem('exclude-today-transactions', String(value));
  };

  return (
    <ExcludeTodayContext.Provider value={{ excludeToday, setExcludeToday }}>
      {children}
    </ExcludeTodayContext.Provider>
  );
};

export const useExcludeToday = () => {
  const context = useContext(ExcludeTodayContext);
  if (context === undefined) {
    throw new Error('useExcludeToday must be used within an ExcludeTodayProvider');
  }
  return context;
};
