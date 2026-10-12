import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-4 sm:right-5 z-[60] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-[2px] border max-w-[340px] w-full animate-toast-in ${
              isError
                ? 'bg-[#141517] border-[#B42318] text-white'
                : 'bg-[#141517] border-[#141517] text-white'
            }`}
            role="alert"
          >
            <span className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#1D5FD1]" />}
              {isError && <AlertCircle className="w-4 h-4 text-[#F97066]" />}
              {isInfo && <Info className="w-4 h-4 text-[#1D5FD1]" />}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug">{toast.title}</p>
              {toast.message && (
                <p className="text-[12.5px] mt-0.5 text-[#C9D1D6] leading-snug">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 p-0.5 text-[#8C989F] hover:text-white transition-colors duration-150 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
