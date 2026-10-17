import React from 'react';

// If one screen fails to draw, show a message there instead of a blank page; the rest of the site keeps working.
// Give it a `key` that changes with the screen (tab or view) so moving elsewhere tries again.
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('A screen failed to load:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="max-w-md border-t-2 border-[#B42318] pt-5 my-10">
        <p className="font-semibold text-[15px] text-[#141517]">This section could not be shown.</p>
        <p className="mt-1.5 text-[13px] text-[#4E585E]">Reload the page to try again. If it keeps happening, tell the admin team what you clicked.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-5 py-2.5 bg-[#141517] hover:bg-[#2A2E31] text-white text-[13px] font-semibold cursor-pointer">
          Reload
        </button>
      </div>
    );
  }
}
