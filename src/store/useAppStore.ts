import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DateFormat } from '../types';

interface AppState {
    currency: 'IDR' | 'USD';
    theme: 'dark' | 'light';
    language: 'id' | 'en';
    dateFormat: DateFormat;
    firstDayOfWeek: 'Monday' | 'Sunday';
    isBottomMenuVisible: boolean;

    setCurrency: (currency: 'IDR' | 'USD') => void;
    setTheme: (theme: 'dark' | 'light') => void;
    setLanguage: (language: 'id' | 'en') => void;
    setDateFormat: (format: DateFormat) => void;
    setFirstDayOfWeek: (day: 'Monday' | 'Sunday') => void;
    setBottomMenuVisible: (visible: boolean) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currency: 'IDR',
            theme: 'dark',
            language: 'id',
            dateFormat: 'DD/MM/YYYY',
            firstDayOfWeek: 'Monday',
            isBottomMenuVisible: true,

            setCurrency: (currency) => set({ currency }),
            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setDateFormat: (dateFormat) => set({ dateFormat }),
            setFirstDayOfWeek: (firstDayOfWeek) => set({ firstDayOfWeek }),
            setBottomMenuVisible: (visible) => set({ isBottomMenuVisible: visible }),
        }),
        {
            name: 'kopr-app-storage',
            partialize: (state) => ({
                currency: state.currency,
                theme: state.theme,
                language: state.language,
                dateFormat: state.dateFormat,
                firstDayOfWeek: state.firstDayOfWeek,
            }),
        }
    )
);
