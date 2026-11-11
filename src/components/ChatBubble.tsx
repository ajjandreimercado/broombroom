import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PORTAL } from '../portals.ts';
import { local } from '../push.ts';
import { ArrowUpRight, Send, X } from 'lucide-react';

// Messenger-style chat head for clients and agents: floats over every page, shows unread messages, opens a mini
// chat. Drag it anywhere; it snaps to the nearest side. Hidden on the full Messages page.
const SIZE = 56;
const POS_KEY = 'bb-bubble-pos';
type Pos = { side: 'left' | 'right'; bottom: number };
const loadPos = (): Pos => {
  try {
    const p = JSON.parse(local.get(POS_KEY) ?? '');
    if ((p.side === 'left' || p.side === 'right') && typeof p.bottom === 'number') return p;
  } catch {}
  return { side: 'right', bottom: 96 };
};
const clampBottom = (b: number) => Math.min(Math.max(b, 16), window.innerHeight - SIZE - 80);
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

export const ChatBubble: React.FC = () => {
  const { currentUser, conversations, currentView, accountTab, sellerTab, sendMessage, markConversationRead, navigateTo, setActiveConversationId } = useApp();
  const agent = PORTAL === 'seller';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>(loadPos);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [hop, setHop] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const start = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const chats = conversations
    .filter((c) => !c.closedAt && (!agent || c.sellerName === currentUser?.name))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const unreadOf = (c: (typeof chats)[number]) => (agent ? c.unreadSeller : c.unreadBuyer);
  const unread = chats.reduce((n, c) => n + unreadOf(c), 0);
  const chat = chats.find((c) => c.id === pickedId) ?? chats.find((c) => unreadOf(c) > 0) ?? chats[0];
  const other = (c: (typeof chats)[number]) => (agent ? c.buyerName : c.sellerName);
  const mine = (m: { isSeller: boolean }) => (agent ? m.isSeller : !m.isSeller);

  // A new message: hop and show a one-line preview for 4 seconds (unless the mini chat is open on it).
  const lastUnread = useRef(unread);
  useEffect(() => {
    if (unread > lastUnread.current && !open) {
      const latest = chats.find((c) => unreadOf(c) > 0);
      setHop((h) => h + 1);
      setPreview(latest ? `${other(latest)}: ${latest.lastMessage}` : null);
      const t = window.setTimeout(() => setPreview(null), 4000);
      lastUnread.current = unread;
      return () => window.clearTimeout(t);
    }
    lastUnread.current = unread;
  }, [unread]);

  // The open chat is read as messages arrive, and shows the newest (before paint, so it never jumps).
  useLayoutEffect(() => {
    if (!open || !chat) return;
    if (unreadOf(chat) > 0) markConversationRead(chat.id);
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, chat?.id, chat?.messages.length]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const onFullPage = (agent && currentView === 'seller' && sellerTab === 'messages') || (!agent && currentView === 'account' && accountTab === 'messages');
  if (!currentUser || PORTAL === 'admin' || !chats.length || onFullPage) return null;

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.px, e.clientY - s.py) < 6) return;
    s.moved = true;
    setDrag({ x: e.clientX - SIZE / 2, y: e.clientY - SIZE / 2 });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s?.moved) return setOpen((o) => !o);
    const next: Pos = { side: e.clientX < window.innerWidth / 2 ? 'left' : 'right', bottom: clampBottom(window.innerHeight - e.clientY - SIZE / 2) };
    setDrag(null);
    setPos(next);
    local.set(POS_KEY, JSON.stringify(next));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat || !text.trim()) return;
    const t = text.trim();
    setText('');
    if (!(await sendMessage(chat.id, t))) setText(t);
  };
  const openFull = () => {
    if (chat) setActiveConversationId(chat.id);
    setOpen(false);
    if (agent) navigateTo('seller', { sellerTab: 'messages' });
    else navigateTo('account', { accountTab: 'messages' });
  };

  const sideStyle = drag ? { left: drag.x, top: drag.y } : { [pos.side]: 16, bottom: `calc(${pos.bottom}px + env(safe-area-inset-bottom))` };
  const name = chat ? other(chat) : '';

  return (
    <>
      {open && chat && (
        <section
          role="dialog"
          aria-label={`Chat with ${name}`}
          className="fixed z-[70] flex flex-col bg-white border border-[#141517] shadow-[0_12px_40px_rgba(0,0,0,0.22)] animate-modal-in inset-x-0 bottom-0 h-[72dvh] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px] sm:h-[520px]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <header className="flex items-center gap-3 px-3 py-2.5 border-b border-[#C9D1D6]">
            <span className="w-9 h-9 rounded-full bg-[#141517] text-white grid place-items-center font-semibold shrink-0">{name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[14.5px] text-[#141517] truncate">{name}</p>
              <p className="text-[12px] text-[#4E585E] truncate">{chat.vehicleTitle}</p>
            </div>
            <button onClick={openFull} aria-label="Open full chat" className="p-2 text-[#4E585E] hover:text-[#141517] cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-2 text-[#4E585E] hover:text-[#141517] cursor-pointer"><X className="w-4 h-4" /></button>
          </header>
          {chats.length > 1 && (
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-[#EEF1F2]" role="tablist" aria-label="Chats">
              {chats.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={c.id === chat.id}
                  onClick={() => setPickedId(c.id)}
                  className={`shrink-0 px-2.5 py-1 text-[12.5px] border cursor-pointer ${c.id === chat.id ? 'bg-[#141517] text-white border-[#141517]' : 'bg-white border-[#C9D1D6]'}`}
                >
                  {other(c).split(' ')[0]}
                  {unreadOf(c) > 0 && <span className="ml-1 px-1 bg-[#D92D20] text-white text-[10.5px] font-semibold rounded-full">{unreadOf(c)}</span>}
                </button>
              ))}
            </div>
          )}
          <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 bg-[#F7F8F8]">
            {chat.messages.slice(-40).map((m) => (
              <div key={m.id} className={`flex ${mine(m) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 text-[14px] leading-snug ${mine(m) ? 'bg-[#1D5FD1] text-white' : 'bg-white border border-[#DDE3E6] text-[#141517]'}`}>
                  {m.applyVehicleTitle ? <span className="block font-semibold">Apply link: {m.applyVehicleTitle}</span> : null}
                  <span className="whitespace-pre-wrap break-words">{m.text}</span>
                  <span className={`block mt-0.5 text-[11px] ${mine(m) ? 'text-white/75' : 'text-[#6B767D]'}`}>{time(m.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex items-end gap-2 p-2 border-t border-[#C9D1D6]">
            <label className="flex-1">
              <span className="sr-only">Message {name}</span>
              <textarea
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) send(e);
                }}
                placeholder="Write a message"
                className="w-full max-h-28 px-3 py-2 text-[16px] bg-white border border-[#8C989F] resize-none"
              />
            </label>
            <button type="submit" disabled={!text.trim()} aria-label="Send" className="p-2.5 bg-[#1D5FD1] text-white cursor-pointer disabled:opacity-50"><Send className="w-4 h-4" /></button>
          </form>
        </section>
      )}

      {!open && (
        <div className="fixed z-[65] flex items-center gap-2 touch-none select-none" style={{ ...sideStyle, flexDirection: pos.side === 'left' ? 'row' : 'row-reverse' }}>
          <button
            key={hop}
            aria-label={`Chats${unread ? `, ${unread} unread` : ''}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(true))}
            className={`relative w-14 h-14 rounded-full bg-[#141517] text-white grid place-items-center font-display text-[22px] shadow-[0_6px_20px_rgba(0,0,0,0.3)] border-2 border-white cursor-grab active:cursor-grabbing ${hop ? 'animate-bubble-hop' : ''}`}
          >
            {name.charAt(0).toUpperCase()}
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-[#D92D20] text-white text-[12px] font-semibold grid place-items-center border-2 border-white tabular-nums">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {preview && !drag && (
            <button onClick={() => (setPreview(null), setOpen(true))} className="max-w-[220px] px-3 py-2 bg-white border border-[#141517] text-left text-[13px] text-[#141517] shadow-md animate-toast-in cursor-pointer">
              <span className="line-clamp-2">{preview}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
