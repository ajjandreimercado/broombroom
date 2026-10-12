// Shared motion vocabulary. Mirrors the CSS curves in index.css (--ease-out, --ease-in-out).
// Full transform strings, not x/y/scale shorthands, so Motion keeps them on the compositor.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// Backdrop fades with its panel so the two read as one surface.
export const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: EASE_OUT },
};

// Modals stay centered (not trigger-anchored) and scale from 0.96.
export const modalMotion = {
  initial: { opacity: 0, transform: 'scale(0.96)' },
  animate: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.96)' },
  transition: { duration: 0.25, ease: EASE_OUT },
};

// Menus grow out of their trigger; pass transformOrigin via style.
export const popoverMotion = {
  initial: { opacity: 0, transform: 'scale(0.95)' },
  animate: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.95)' },
  transition: { duration: 0.18, ease: EASE_OUT },
};

// Bottom sheets and docks rise from the edge they live on and leave the same way.
export const sheetMotion = {
  initial: { transform: 'translateY(100%)' },
  animate: { transform: 'translateY(0%)' },
  exit: { transform: 'translateY(100%)' },
  transition: { duration: 0.45, ease: EASE_DRAWER },
};

// A moving underline between tabs: on-screen movement, so ease-in-out.
export const indicatorTransition = { duration: 0.25, ease: EASE_IN_OUT };

// Side panels slide in from the right edge they live on and leave the same way.
export const drawerMotion = {
  initial: { transform: 'translateX(100%)' },
  animate: { transform: 'translateX(0%)' },
  exit: { transform: 'translateX(100%)' },
  transition: { duration: 0.4, ease: EASE_DRAWER },
};
