import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const colors = {
  light: {
    primary: '#000000',
    secondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    text: '#000000',
    textSecondary: '#666666',
    error: '#B00020',
  },
  dark: {
    primary: '#FFFFFF',
    secondary: '#999999',
    background: '#121212',
    surface: '#1E1E1E',
    border: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#999999',
    error: '#CF6679',
  },
};

type ThemeContextType = {
  colors: typeof colors.light;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const value = {
    colors: isDark ? colors.dark : colors.light,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}