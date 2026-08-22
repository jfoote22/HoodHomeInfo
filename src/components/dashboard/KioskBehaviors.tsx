'use client';

import { useEffect } from 'react';

/**
 * Always-on TV behaviors. Renders nothing.
 *  - Keeps the screen awake via the Screen Wake Lock API (re-acquired when the tab
 *    becomes visible again, e.g. after the TV input is switched back).
 *  - Hides the mouse cursor after a few idle seconds.
 *  - Hard-reloads the page once a day (default 4:00 AM local) so a long-running browser
 *    never accumulates leaked memory / stale JS; also reloads if it's been >36h.
 *  - Re-fetches everything when the tab regains visibility after being hidden a while.
 */
export default function KioskBehaviors({ reloadHour = 4 }: { reloadHour?: number }) {
  useEffect(() => {
    // ---- Wake lock ----
    let lock: any = null;
    const requestLock = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (!wl || document.visibilityState !== 'visible') return;
        lock = await wl.request('screen');
        lock.addEventListener?.('release', () => {
          lock = null;
        });
      } catch {
        /* unsupported or denied (e.g. low battery) - fine */
      }
    };
    requestLock();

    // ---- Visibility: re-acquire lock / reload if we were away a long time ----
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else {
        requestLock();
        if (hiddenAt && Date.now() - hiddenAt > 6 * 36e5) window.location.reload();
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ---- Cursor auto-hide ----
    let cursorTimer: ReturnType<typeof setTimeout> | null = null;
    const showCursor = () => {
      document.body.style.cursor = '';
      if (cursorTimer) clearTimeout(cursorTimer);
      cursorTimer = setTimeout(() => {
        document.body.style.cursor = 'none';
      }, 4000);
    };
    showCursor();
    window.addEventListener('mousemove', showCursor);
    window.addEventListener('keydown', showCursor);

    // ---- Daily reload ----
    const bootedAt = Date.now();
    const reloadCheck = setInterval(() => {
      const now = new Date();
      const uptimeH = (Date.now() - bootedAt) / 36e5;
      const atReloadHour = now.getHours() === reloadHour && now.getMinutes() < 2;
      if ((atReloadHour && uptimeH > 1) || uptimeH > 36) window.location.reload();
    }, 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', showCursor);
      window.removeEventListener('keydown', showCursor);
      if (cursorTimer) clearTimeout(cursorTimer);
      clearInterval(reloadCheck);
      document.body.style.cursor = '';
      try {
        lock?.release?.();
      } catch {
        /* noop */
      }
    };
  }, [reloadHour]);

  return null;
}
