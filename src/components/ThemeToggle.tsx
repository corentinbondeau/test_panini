'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { Sun, Moon } from 'lucide-react';
import styles from './header.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return (
    <button onClick={toggleTheme} className={styles.themeBtn} aria-label="Changer le thème">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
