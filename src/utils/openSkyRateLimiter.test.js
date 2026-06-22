import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('openSkyRateLimiter', () => {
  let remaining, msUntilSlotAvailable, recordRequest, acquireSlot, status;

  beforeEach(async () => {
    vi.useFakeTimers();
    const mod = await import('./openSkyRateLimiter');
    remaining = mod.remaining;
    msUntilSlotAvailable = mod.msUntilSlotAvailable;
    recordRequest = mod.recordRequest;
    acquireSlot = mod.acquireSlot;
    status = mod.status;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  describe('remaining', () => {
    it('returns max credits when no requests made', () => {
      expect(remaining()).toBe(166);
    });

    it('decreases after recording requests', () => {
      recordRequest();
      recordRequest();
      expect(remaining()).toBe(164);
    });
  });

  describe('msUntilSlotAvailable', () => {
    it('returns 0 when slots are available', () => {
      expect(msUntilSlotAvailable()).toBe(0);
    });

    it('returns positive wait time when window is full', () => {
      for (let i = 0; i < 166; i++) {
        recordRequest();
      }
      expect(msUntilSlotAvailable()).toBeGreaterThan(0);
    });
  });

  describe('acquireSlot', () => {
    it('resolves immediately when slots available', async () => {
      const start = Date.now();
      await acquireSlot();
      expect(Date.now()).toBe(start);
    });
  });

  describe('status', () => {
    it('returns status object with correct fields', () => {
      const s = status();
      expect(s).toHaveProperty('used');
      expect(s).toHaveProperty('remaining');
      expect(s).toHaveProperty('maxCredits', 166);
      expect(s).toHaveProperty('windowMs', 60 * 60 * 1000);
    });
  });
});
