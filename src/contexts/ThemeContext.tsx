'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// 定义黑白主题
const getTheme = (mode: ThemeMode) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#212121' : '#ffffff',
      },
      secondary: {
        main: mode === 'light' ? '#424242' : '#bdbdbd',
      },
      background: {
        default: mode === 'light' ? '#ffffff' : '#121212',
        paper: mode === 'light' ? '#f5f5f5' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? '#212121' : '#ffffff',
        secondary: mode === 'light' ? '#757575' : '#bdbdbd',
      },
    },
    typography: {
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
          },
          containedPrimary: {
            '&:hover': {
              backgroundColor: mode === 'light' ? '#424242' : '#e0e0e0',
              color: mode === 'light' ? '#ffffff' : '#121212',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' 
              ? '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)' 
              : '0 4px 6px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.2)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
};

const THEME_STORAGE_KEY = 'fim-ai-theme-mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // 初始状态设为null，避免首次渲染不匹配
  const [mode, setMode] = useState<ThemeMode | null>(null);
  
  // 加载主题偏好
  useEffect(() => {
    // 尝试从localStorage读取主题偏好
    if (typeof window !== 'undefined') {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setMode(savedTheme);
      } else {
        // 如果没有保存的主题，则使用系统偏好
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setMode(prefersDarkMode ? 'dark' : 'light');
      }
    }
  }, []);

  // 主题切换函数
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, newMode);
      }
      return newMode;
    });
  };

  // 等待客户端模式确定后再渲染
  if (mode === null) {
    return null; // 或者返回一个加载指示器
  }

  // 动态创建主题
  const theme = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}; 