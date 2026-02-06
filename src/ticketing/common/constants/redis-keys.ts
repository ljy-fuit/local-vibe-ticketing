export const RedisKeys = {
  waiting: (eventId: string) => `tkt:${eventId}:waiting`,
  active: (eventId: string) => `tkt:${eventId}:active`,
  activeCount: (eventId: string) => `tkt:${eventId}:active_count`,
  stock: (eventId: string) => `tkt:${eventId}:stock`,
  reservation: (eventId: string, userId: string) =>
    `tkt:${eventId}:rsv:${userId}`,
  payment: (eventId: string, userId: string) => `tkt:${eventId}:pay:${userId}`,
  state: (eventId: string, userId: string) => `tkt:${eventId}:state:${userId}`,
  config: (eventId: string) => `tkt:${eventId}:config`,
  openEvents: () => 'tkt:events:open',
  admissionLock: (eventId: string) => `tkt:${eventId}:lock:admission`,
} as const;
