import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusMark } from '../StatusMark.tsx';
import { FilterTabs, SectionHeader, EmptyState, btn, shortDate } from './ui.tsx';

type Filter = 'pending' | 'closed' | 'all';

// Admin: reports clients filed against listings. Pending ones need a decision.
export const SafetyReports: React.FC = () => {
  const { reports, adminResolveReport } = useApp();
  const [filter, setFilter] = useState<Filter>('pending');
  const rows = reports.filter((r) => filter === 'all' || (filter === 'pending' ? r.status === 'pending' : r.status !== 'pending'));
  const pending = reports.filter((r) => r.status === 'pending').length;

  return (
    <section className="space-y-5">
      <SectionHeader title="Reports" hint="Listing reports from clients. Dismiss a report, or take the listing down while it is checked." />
      <FilterTabs
        id="reports"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: 'Pending', count: pending },
          { value: 'closed', label: 'Resolved', count: reports.length - pending },
          { value: 'all', label: 'All', count: reports.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'No pending reports' : 'Nothing here'} body="Reports that clients file against a listing appear in this list." />
      ) : (
        <ul key={filter} className="animate-view-fade">
          {rows.map((r) => (
            <li key={r.id} className="py-5 border-b border-[#C9D1D6] space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[15px] text-[#141517]">{r.vehicleTitle}</p>
                <StatusMark status={r.status} />
              </div>
              <p className="text-[13px] text-[#2A2E31]"><strong>{r.reason}</strong>: {r.details}</p>
              <p className="text-[12.5px] text-[#4E585E]">Reported by {r.reportedBy} ({r.reportedEmail}) · {shortDate(r.createdAt)}</p>
              {r.status === 'pending' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className={btn.outline} onClick={() => adminResolveReport(r.id, 'dismiss')}>Dismiss</button>
                  <button className={btn.danger} onClick={() => adminResolveReport(r.id, 'unpublish_vehicle')}>Take listing down</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
