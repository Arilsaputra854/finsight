import test from 'node:test';
import assert from 'node:assert/strict';
import { seedSales, seedStock, parseCSV, group, kpis, ask, anomalies } from '../src/core.js';

test('seed data is deterministic and covers 12 months', () => {
  assert.deepEqual(seedSales(7), seedSales(7));
  assert.equal(group(seedSales(), 'month').length, 12);
});

test('kpis add up', () => {
  const k = kpis([{ qty: 2, revenue: 100, cost: 60 }, { qty: 1, revenue: 50, cost: 40 }]);
  assert.deepEqual([k.revenue, k.profit, k.units], [150, 50, 3]);
  assert.ok(Math.abs(k.margin - 1 / 3) < 1e-9);
});

test('parseCSV skips malformed rows', () => {
  const r = parseCSV('month,product,qty,revenue,cost\n2026-01,A,1,100,60\nbad,row\n2026-02,B,x,y,z');
  assert.equal(r.length, 1);
  assert.equal(r[0].product, 'A');
});

test('ask routes to the right intent', () => {
  const rows = seedSales(), stock = seedStock();
  assert.match(ask('produk apa yang paling rugi bulan lalu?', rows, stock).text, /Margin terendah/);
  assert.match(ask('produk terlaris', rows, stock).text, /Terlaris/);
  assert.ok(ask('stok menipis', rows, stock).table.rows.length > 0);
  assert.match(ask('cuaca besok?', rows, stock).text, /belum paham/);
});

test('anomaly detection flags the seeded spike', () => {
  assert.ok(anomalies(seedSales()).some(a => a.product === 'Tumbler Steel' && a.month === '2026-09'));
});
