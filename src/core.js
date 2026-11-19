// FinSight core: seeded data, CSV parse, KPIs, and rule-based "Ask Your Data".
export function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; }

export const PRODUCTS = [
  ['Kopi Arabika 250g', 55000, 32000, 40], ['Teh Melati 100g', 28000, 15000, 80], ['Gelas Keramik', 45000, 41000, 25],
  ['Tumbler Steel', 120000, 70000, 18], ['Grinder Manual', 250000, 190000, 6], ['Paket Hadiah', 180000, 175000, 9]];

export function seedSales(seed = 7) {
  const r = rng(seed), rows = [];
  for (let m = 0; m < 12; m++) for (const [name, price, cost] of PRODUCTS) {
    const trend = 1 + m * 0.04, qty = Math.round((20 + r() * 40) * trend * (m === 8 && name === 'Tumbler Steel' ? 3 : 1));
    rows.push({ month: `2026-${String(m + 1).padStart(2, '0')}`, product: name, qty, revenue: qty * price, cost: qty * cost });
  }
  return rows;
}
export const seedStock = () => PRODUCTS.map(p => ({ product: p[0], stock: p[3], reorder: 20 }));

export function parseCSV(text) {
  const [h, ...lines] = text.trim().split(/\r?\n/); const cols = h.split(',').map(s => s.trim().toLowerCase());
  return lines.filter(Boolean).map(l => { const c = l.split(','); const o = {}; cols.forEach((k, i) => o[k] = c[i]?.trim()); return { month: o.month, product: o.product, qty: +o.qty, revenue: +o.revenue, cost: +o.cost }; })
    .filter(r => r.month && r.product && isFinite(r.revenue) && isFinite(r.cost));
}

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
export function group(rows, key) {
  const m = new Map();
  for (const r of rows) { const g = m.get(r[key]) || { key: r[key], qty: 0, revenue: 0, cost: 0 }; g.qty += r.qty; g.revenue += r.revenue; g.cost += r.cost; m.set(r[key], g); }
  return [...m.values()].map(g => ({ ...g, profit: g.revenue - g.cost, margin: g.revenue ? (g.revenue - g.cost) / g.revenue : 0 })).sort((a, b) => a.key < b.key ? -1 : 1);
}
export const kpis = rows => { const rev = sum(rows, r => r.revenue), cost = sum(rows, r => r.cost); return { revenue: rev, profit: rev - cost, margin: rev ? (rev - cost) / rev : 0, units: sum(rows, r => r.qty) }; };
export const idr = n => 'Rp' + Math.round(n).toLocaleString('id-ID');

export function anomalies(rows) {
  const out = [];
  for (const p of group(rows, 'product')) {
    const series = group(rows.filter(r => r.product === p.key), 'month'); const v = series.map(s => s.revenue);
    const mean = sum(v, x => x) / v.length, sd = Math.sqrt(sum(v, x => (x - mean) ** 2) / v.length) || 1;
    series.forEach(s => { const z = (s.revenue - mean) / sd; if (Math.abs(z) > 2.2) out.push({ product: p.key, month: s.key, z: +z.toFixed(1), revenue: s.revenue }); });
  }
  return out;
}

/** Returns {text, table:{head,rows}}. Intent matching is rule-based; production swaps this for Gemini function-calling over SQL. */
export function ask(q, rows, stock) {
  q = q.toLowerCase();
  const months = group(rows, 'month').map(m => m.key), last = months[months.length - 1], prev = months[months.length - 2];
  const scope = /bulan lalu|last month/.test(q) ? prev : /bulan ini|this month/.test(q) ? last : null;
  const data = scope ? rows.filter(r => r.month === scope) : rows; const label = scope ? `bulan ${scope}` : 'seluruh periode';
  const byP = group(data, 'product');
  if (/rugi|margin (rendah|terkecil)|paling tipis|lowest margin/.test(q)) {
    const s = [...byP].sort((a, b) => a.margin - b.margin).slice(0, 3);
    return { text: `Margin terendah ${label}: ${s[0].key} (${(s[0].margin * 100).toFixed(1)}%). Produk dengan margin tipis perlu dinaikkan harganya atau dicari supplier lebih murah.`, table: { head: ['Produk', 'Revenue', 'Profit', 'Margin'], rows: s.map(p => [p.key, idr(p.revenue), idr(p.profit), (p.margin * 100).toFixed(1) + '%']) } };
  }
  if (/terlaris|paling laku|best sell|top/.test(q)) {
    const s = [...byP].sort((a, b) => b.qty - a.qty).slice(0, 3);
    return { text: `Terlaris ${label}: ${s[0].key} (${s[0].qty} unit).`, table: { head: ['Produk', 'Unit', 'Revenue'], rows: s.map(p => [p.key, p.qty, idr(p.revenue)]) } };
  }
  if (/stok|stock|habis|menipis/.test(q)) {
    const s = stock.filter(x => x.stock <= x.reorder);
    return { text: s.length ? `${s.length} produk di bawah batas reorder.` : 'Semua stok aman.', table: { head: ['Produk', 'Stok', 'Batas'], rows: s.map(x => [x.product, x.stock, x.reorder]) } };
  }
  if (/anomali|aneh|lonjakan|anomaly|spike/.test(q)) {
    const a = anomalies(rows);
    return { text: a.length ? `Ditemukan ${a.length} anomali (|z|>2.2).` : 'Tidak ada anomali signifikan.', table: { head: ['Produk', 'Bulan', 'z-score', 'Revenue'], rows: a.map(x => [x.product, x.month, x.z, idr(x.revenue)]) } };
  }
  if (/tren|trend|pendapatan|revenue|omzet/.test(q)) {
    const m = group(rows, 'month'); const g = (m[m.length - 1].revenue / m[0].revenue - 1) * 100;
    return { text: `Revenue ${g >= 0 ? 'naik' : 'turun'} ${Math.abs(g).toFixed(0)}% dari ${m[0].key} ke ${m[m.length - 1].key}.`, table: { head: ['Bulan', 'Revenue', 'Profit'], rows: m.map(x => [x.key, idr(x.revenue), idr(x.profit)]) } };
  }
  return { text: 'Saya belum paham pertanyaan itu. Coba: "produk apa yang paling rugi bulan lalu?", "terlaris", "stok menipis", "anomali", atau "tren pendapatan".', table: null };
}
