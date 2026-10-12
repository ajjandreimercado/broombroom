import React, { useEffect, useRef, useState } from 'react';
import { Stamp } from './Stamp.tsx';

export interface LogEntry {
  label: string;
  title: string;
  body: string;
  stamp: string;
}

// A ruled service log. Entries are stamped one after another the first time the
// list scrolls into view.
export const StampedLog: React.FC<{ entries: LogEntry[] }> = ({ entries }) => {
  const ref = useRef<HTMLOListElement>(null);
  const [stamped, setStamped] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        entries.forEach((_, i) => timers.push(window.setTimeout(() => setStamped(i + 1), 250 + i * 240)));
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [entries]);

  return (
    <ol ref={ref} className="border-t-2 border-[#141517]">
      {entries.map((step, i) => (
        <li
          key={step.title}
          className="grid grid-cols-[64px_1fr] sm:grid-cols-[100px_1fr_120px] items-start sm:items-center gap-x-4 gap-y-2 py-6 border-b border-[#C9D1D6]"
        >
          <span className="gb-label tabular-nums pt-1.5 sm:pt-0">{step.label}</span>
          <div>
            <h3 className="text-[18px] font-semibold text-[#141517]">{step.title}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4E585E] max-w-[56ch]">{step.body}</p>
          </div>
          <div className="col-start-2 sm:col-start-auto h-10 sm:h-12 flex sm:justify-center items-center">
            <Stamp label={step.stamp} show={stamped > i} />
          </div>
        </li>
      ))}
    </ol>
  );
};
