import { useEffect, useRef } from 'react';

/**
 * useAutoLock Hook
 * Automatically locks the app after a period of inactivity
 * 
 * @param {number} timeout - Timeout in milliseconds (default: 5 minutes)
 * @param {boolean} enabled - Whether auto-lock is enabled
 * 
 * @example
 * useAutoLock(300000, isAutoLockEnabled); // 5 minutes
 */
export function useAutoLock(timeout = 300000, enabled = true) {
    const timerRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        const handleLock = () => {
            // Set app as locked
            localStorage.setItem('app_locked', 'true');
            localStorage.setItem('lock_timestamp', Date.now().toString());

            // Reload to show PIN screen
            window.location.reload();
        };

        const resetTimer = () => {
            // Clear existing timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            // Set new timer
            timerRef.current = setTimeout(handleLock, timeout);
        };

        // Activity events to track
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [timeout, enabled]);
}

/**
 * Get auto-lock settings from localStorage
 * @returns {object} - Auto-lock settings
 */
export function getAutoLockSettings() {
    try {
        const settings = localStorage.getItem('autolock_settings');
        return settings ? JSON.parse(settings) : {
            enabled: false,
            timeout: 300000 // 5 minutes default
        };
    } catch (error) {
        return {
            enabled: false,
            timeout: 300000
        };
    }
}

/**
 * Save auto-lock settings
 * @param {boolean} enabled - Whether auto-lock is enabled
 * @param {number} timeout - Timeout in milliseconds
 */
export function setAutoLockSettings(enabled, timeout) {
    localStorage.setItem('autolock_settings', JSON.stringify({
        enabled,
        timeout
    }));
}

/**
 * Check if app should be locked (for initial load)
 * @returns {boolean} - Whether app should be locked
 */
export function shouldAutoLock() {
    const isLocked = localStorage.getItem('app_locked') === 'true';
    const isPinEnabled = localStorage.getItem('pin_enabled') === 'true';

    return isLocked && isPinEnabled;
}

export default useAutoLock;
