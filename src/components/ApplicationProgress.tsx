import React from 'react';
import { Check } from 'lucide-react';
import { VehicleApplication } from '../types.ts';

const STOPPED = ['declined', 'withdrawn'];

// The vehicle is held for the client (reserved, processing or approved) and not yet released.
export const isOngoing = (app: VehicleApplication) => ['reserved', 'processing', 'approved'].includes(app.status);
export const amountPaid = (app: VehicleApplication) => (app.payments ?? []).reduce((s, p) => s + p.amount, 0);

// Where a client's purchase stands, from application to release. Built from the shared application record,
// so it moves on its own when the admin acts in another tab (AppContext syncs storage across tabs).
export const progressSteps = (app: VehicleApplication) => {
  const reached = (...st: VehicleApplication['status'][]) => st.includes(app.status);
  const reserved = reached('reserved', 'processing', 'approved', 'completed');
  const sheetIn = reached('processing', 'approved', 'completed');
  const approved = reached('approved', 'completed');
  const completed = app.status === 'completed';
  const docs = app.documents ?? [];
  const docsDone = reserved || (docs.length > 0 && docs.every((d) => d.status === 'approved'));
  const missing = docs.filter((d) => !d.fileName).length;
  const steps = [
    { label: 'Application sent', detail: new Date(app.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), done: true },
    {
      label: 'Documents checked',
      detail: docsDone ? 'All approved' : missing ? `${missing} still to hand to the admin` : docs.some((d) => d.status === 'rejected') ? 'A document needs attention' : 'Admin is reviewing',
      done: docsDone,
    },
    { label: 'Reserved', detail: reserved ? 'Vehicle held for you · AR released' : 'After your documents are checked', done: reserved },
    { label: 'Information sheet', detail: sheetIn ? 'Received' : reserved ? 'Please fill it in' : 'After the reservation', done: sheetIn },
    { label: 'Approved', detail: approved ? 'Application approved' : sheetIn ? 'Admin is processing' : 'After the information sheet', done: approved },
    { label: 'Released to you', detail: completed ? 'With OR and CR' : 'Once the OR and CR are ready', done: completed },
  ];
  const current = steps.findIndex((s) => !s.done);
  return { steps, current: current === -1 ? steps.length : current, stopped: STOPPED.includes(app.status) };
};

export const ApplicationProgress: React.FC<{ app: VehicleApplication; stacked?: boolean }> = ({ app, stacked }) => {
  const sm = (cls: string) => (stacked ? '' : cls); // wide layouts lay the steps out in a row
  const { steps, current, stopped } = progressSteps(app);
  return (
    <div>
      <ol className={`grid grid-cols-1 ${sm('sm:grid-cols-6 sm:gap-2')}`} aria-label="Purchase progress">
        {steps.map((s, i) => {
          const isCurrent = i === current && !stopped;
          return (
            <li
              key={s.label}
              aria-current={isCurrent ? 'step' : undefined}
              className={`block py-2 border-l-2 pl-3 transition-colors duration-300 ${sm('sm:py-0 sm:pt-3 sm:border-l-0 sm:border-t-[3px] sm:pl-0')} ${
                s.done ? 'border-[#1B7F35]' : isCurrent ? 'border-[#1D5FD1]' : 'border-[#DDE3E6]'
              }`}
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#141517]">
                {s.done && <Check className="w-3.5 h-3.5 text-[#1B7F35] shrink-0" aria-hidden="true" />}
                {isCurrent && <span className="w-2 h-2 rounded-full bg-[#1D5FD1] animate-pulse shrink-0" aria-hidden="true" />}
                {s.label}
                <span className="sr-only">{s.done ? '(done)' : isCurrent ? '(in progress)' : '(not started)'}</span>
              </span>
              <span className={`block text-[11.5px] text-[#4E585E] ${sm('sm:mt-0.5')}`}>{s.detail}</span>
            </li>
          );
        })}
      </ol>
      {stopped && (
        <p className="mt-2 text-[12.5px] text-[#B42318]">
          This application was {app.status}. {app.sellerNotes ? `Reason: ${app.sellerNotes}` : ''}
        </p>
      )}
    </div>
  );
};
