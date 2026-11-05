import type { Conversation } from '../types.ts';

// The units a chat is about: every vehicle the agent sent an apply link for, else the chat's own vehicle.
export const chatUnits = (c: Conversation): string => {
  const titles = [...new Set(c.messages.map((m) => m.applyVehicleTitle).filter((t): t is string => !!t))];
  return titles.length ? titles.join(', ') : c.vehicleTitle;
};
