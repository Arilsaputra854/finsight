# Arah desain: FinSight

Reading this as: laporan keuangan untuk pemilik toko, bergaya cetak laporan tahunan, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

| Keputusan | Alasan satu baris |
|---|---|
| Krem dan hijau tua `#0f3d2e`, emas `#a8741a` sebagai aksen tunggal | Warna laporan keuangan tercetak; emas hanya untuk garis laba supaya mudah dibedakan dari batang pendapatan. |
| Newsreader untuk judul dan angka besar, Public Sans untuk isi | Angka utama dibaca seperti kepala laporan; isi tabel butuh keterbacaan. |
| Angka tabular (`tabular-nums`) dan rata kanan | Kolom angka harus sejajar agar bisa dibandingkan. |
| Judul bagan berupa pertanyaan ("Apakah pendapatan tumbuh...") | Setiap grafik ada karena menjawab satu pertanyaan, bukan pengisi ruang. |
| Angka utama dipisah garis, bukan kartu | Empat angka sejajar dalam satu baris laporan. |
| Dua kolom tidak setara dengan garis ganda di kepala | Mengikuti tata letak halaman laporan; juga ramah cetak. |
| Margin di bawah 15% berwarna merah bata plus garis batas bertulisan | Warna tidak berdiri sendiri, garis batas diberi label teks. |
| Tanpa animasi, tanpa bayangan | Dokumen laporan statis; gaya cetak (`@media print`) disediakan. |
