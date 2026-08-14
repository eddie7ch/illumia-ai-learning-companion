import { useEffect, useState } from 'react';

/** Live-updating current date and time, refreshed every second. */
export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      {date} · {time}
    </p>
  );
}
