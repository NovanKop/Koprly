import { useState, useEffect } from 'react';

export type UserEnvironment = 'safari-ios' | 'chrome-ios' | 'chrome-android' | 'other' | 'standalone';

export const usePWADetect = () => {
    const [environment, setEnvironment] = useState<UserEnvironment>('other');
    const [isStandalone, setIsStandalone] = useState<boolean>(false);

    useEffect(() => {
        // 1. Standalone Check
        const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
        // Check iOS specific standalone property as fallback
        const isIosStandalone = ('standalone' in window.navigator) && ((window.navigator as any).standalone === true);

        if (standaloneMatch || isIosStandalone) {
            setIsStandalone(true);
            setEnvironment('standalone');
            return; // Exit early if already standalone
        }

        // 2. Browser/OS Matrix Check
        const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;

        // Detect Safari on iPhone
        if (/iPhone/i.test(userAgent) && /Safari/i.test(userAgent) && !/CriOS/i.test(userAgent) && !/FxiOS/i.test(userAgent)) {
            setEnvironment('safari-ios');
        }
        // Detect Chrome on iPhone
        else if (/iPhone/i.test(userAgent) && /CriOS/i.test(userAgent)) {
            setEnvironment('chrome-ios');
        }
        // Detect Chrome on Android
        else if (/Android/i.test(userAgent) && /Chrome/i.test(userAgent)) {
            setEnvironment('chrome-android');
        } else {
            setEnvironment('other');
        }

    }, []);

    return { environment, isStandalone };
};
