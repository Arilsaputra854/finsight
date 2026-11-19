import { seedSales, seedStock, parseCSV, group, kpis, idr, ask } from './src/core.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let rows = seedSales(), stock = seedStock();

function render() {
  if (!rows.length) { $('#fig').innerHTML = ''; $('#c1').innerHTML = $('#c2').innerHTML = '<p class="empty">Tidak ada data. Impor CSV dengan kolom month, product, qty, revenue, cost.</p>'; return; }
  const k = kpis(rows);
  $('#fig').innerHTML = [['Pendapatan', idr(k.revenue)], ['Laba kotor', idr(k.profit)], ['Margin', (k.margin * 100).toFixed(1) + '%'], ['Unit terjual', k.units.toLocaleString('id-ID')]]
    .map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('');

  const m = group(rows, 'month'), W = 520, H = 230, pad = 28, bw = (W - pad) / m.length;
  const mx = Math.max(...m.map(x => x.revenue)), y = v => 195 - v / mx * 160;
  const line = m.map((x, i) => `${i ? 'L' : 'M'}${(pad + i * bw + bw / 2).toFixed(1)},${y(Math.max(0, x.profit)).toFixed(1)}`).join('');
  $('#c1').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pendapatan dan laba per bulan">
    ${[0, .5, 1].map(t => `<line x1="${pad}" x2="${W}" y1="${y(mx * t)}" y2="${y(mx * t)}" stroke="var(--rule)"/><text x="0" y="${y(mx * t) + 4}">${mx >= 2e6 ? Math.round(mx * t / 1e6) + 'jt' : Math.round(mx * t).toLocaleString('id-ID')}</text>`).join('')}
    ${m.map((x, i) => `<rect x="${pad + i * bw + 5}" y="${y(x.revenue)}" width="${bw - 10}" height="${195 - y(x.revenue)}" fill="var(--green)"><title>${x.key}: ${idr(x.revenue)}</title></rect><text x="${pad + i * bw + bw / 2}" y="212" text-anchor="middle">${x.key.slice(5)}</text>`).join('')}
    <path d="${line}" fill="none" stroke="var(--gold)" stroke-width="2.5"/>
    ${m.map((x, i) => `<circle cx="${pad + i * bw + bw / 2}" cy="${y(Math.max(0, x.profit))}" r="3" fill="var(--gold)"><title>${x.key}: laba ${idr(x.profit)}</title></circle>`).join('')}</svg>`;

  const p = group(rows, 'product').sort((a, b) => b.margin - a.margin), LIM = 0.15;
  $('#c2').innerHTML = `<svg viewBox="0 0 520 ${p.length * 34 + 22}" role="img" aria-label="Margin per produk">
    ${p.map((x, i) => `<text x="0" y="${22 + i * 34}">${esc(x.key)}</text><rect x="140" y="${9 + i * 34}" width="${Math.max(2, x.margin * 340)}" height="18" fill="${x.margin < LIM ? 'var(--bad)' : 'var(--green)'}"/><text x="${146 + x.margin * 340}" y="${22 + i * 34}" style="fill:var(--ink)">${(x.margin * 100).toFixed(1)}%</text>`).join('')}
    <line x1="${140 + LIM * 340}" x2="${140 + LIM * 340}" y1="0" y2="${p.length * 34}" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="${146 + LIM * 340}" y="${p.length * 34 + 14}">batas wajar 15%</text></svg>`;

  const low = stock.filter(s => s.stock <= s.reorder);
  if (!stock.length) { $('#stock').innerHTML = '<p class="empty">CSV penjualan tidak memuat data stok, jadi bagian ini kosong.</p>'; return; }
  $('#stock').innerHTML = low.length ? `<table><thead><tr><th>Produk</th><th class="n">Stok</th><th class="n">Batas</th></tr></thead><tbody>${low.map(s => `<tr><td>${esc(s.product)}</td><td class="n low">${s.stock}</td><td class="n">${s.reorder}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Semua stok di atas batas pesan ulang.</p>';
}
render();

const QS = ['Produk apa yang paling rugi bulan lalu?', 'Produk terlaris', 'Stok menipis', 'Ada anomali?', 'Tren pendapatan'];
$('#chips').innerHTML = QS.map(t => `<button type="button">${t}</button>`).join('');
$('#chips').onclick = e => { if (e.target.tagName === 'BUTTON') { $('#q').value = e.target.textContent; run(); } };
function run() {
  const q = $('#q').value.trim(); if (!q) { $('#ans').innerHTML = '<p class="empty">Ketik pertanyaan atau pilih salah satu contoh.</p>'; return; }
  const r = ask(q, rows, stock);
  $('#ans').innerHTML = `<div class="answer"><p>${esc(r.text)}</p>${r.table && r.table.rows.length ? `<table><thead><tr>${r.table.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${r.table.rows.map(x => `<tr>${x.map((c, i) => `<td${i ? ' class="n"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}</div>`;
}
$('#f').onsubmit = e => { e.preventDefault(); run(); };
$('#pdf').onclick = () => print();
$('#csv').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const r = parseCSV(await f.text());
  if (!r.length) { $('#msg').innerHTML = '<p class="err">CSV tidak terbaca. Kolom wajib: month,product,qty,revenue,cost. Unduh templat untuk contohnya.</p>'; return; }
  $('#msg').innerHTML = ''; rows = r; stock = []; render();
};
$('#tpl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['month,product,qty,revenue,cost\n2026-01,Produk A,10,500000,300000\n2026-02,Produk A,12,600000,360000\n'])); a.download = 'templat.csv'; a.click(); };
