import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCurrentCycle } from '../src/lib/billing';

test('cycle math anchored to first recharge', () => {
  const firstRecharge = new Date('2026-02-01T00:00:00.000Z');

  const cycle1 = calculateCurrentCycle(firstRecharge, new Date('2026-02-15T00:00:00.000Z'));
  assert.ok(cycle1);
  assert.equal(cycle1?.cycleIndex, 1);
  assert.equal(cycle1?.cycleEnd.toISOString(), '2026-03-03T00:00:00.000Z');

  const cycle2 = calculateCurrentCycle(firstRecharge, new Date('2026-03-10T00:00:00.000Z'));
  assert.ok(cycle2);
  assert.equal(cycle2?.cycleIndex, 2);
  assert.equal(cycle2?.cycleEnd.toISOString(), '2026-04-02T00:00:00.000Z');
});

test('returns null when customer has no first recharge', () => {
  const cycle = calculateCurrentCycle(null, new Date('2026-03-10T00:00:00.000Z'));
  assert.equal(cycle, null);
});
