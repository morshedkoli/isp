import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateOldestFirst } from '../src/lib/payment-allocation';

test('allocates payment to oldest unpaid charges first', () => {
  const result = allocateOldestFirst(
    [
      { id: 'cycle-1', remainingAmount: 1000 },
      { id: 'cycle-2', remainingAmount: 800 },
      { id: 'cycle-3', remainingAmount: 600 },
    ],
    1500
  );

  assert.equal(result.allocatedAmount, 1500);
  assert.equal(result.remainingAmount, 0);
  assert.deepEqual(result.allocations, [
    { cycleChargeId: 'cycle-1', amount: 1000 },
    { cycleChargeId: 'cycle-2', amount: 500 },
  ]);
});

test('keeps remainder when payment exceeds due', () => {
  const result = allocateOldestFirst(
    [{ id: 'cycle-1', remainingAmount: 300 }],
    500
  );

  assert.equal(result.allocatedAmount, 300);
  assert.equal(result.remainingAmount, 200);
  assert.deepEqual(result.allocations, [{ cycleChargeId: 'cycle-1', amount: 300 }]);
});
