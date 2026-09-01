# Perbaikan Relasi Legacy SIRAMA

## Penyebab error Laravel

1. `MataKuliahPilihan::transferSks()` dan `transferSksNonFormal()` didefinisikan sebagai `hasOne`, sedangkan database menyimpan banyak baris untuk satu mata kuliah pilihan.
2. `formalReview()` memanggil `create()` setiap halaman dibuka sehingga menghasilkan duplikasi baru.
3. `formalReviewUpdate()` lama menulis kolom penilaian langsung ke `transfer_sks`, walaupun kolom tersebut sudah dipindahkan ke `penilaian_transfer_sks`.
4. Laporan bergantung pada semester aktif sehingga nilai historis mahasiswa dapat tidak terlihat.
5. Relasi `mataKuliah()` memakai `kode_mk` alih-alih foreign key; kode yang berubah atau duplikat dapat memasangkan master mata kuliah yang salah.

## Aturan implementasi Next.js

- Membuka halaman asesmen selalu read-only dan tidak membuat record.
- Penyimpanan nilai memakai transaksi dan hanya menulis ke tabel `penilaian_*`.
- Semua transfer dibaca sebagai array; record dengan nilai diprioritaskan sebagai record kanonik.
- Nilai `0` valid dan dibedakan dari `null`.
- Akses mahasiswa diverifikasi lewat tabel pivot `asesor_mahasiswa` sebelum membaca atau menulis nilai.
- Laporan menggabungkan master semester aktif dengan mata kuliah pilihan historis.
- Tidak ada `delete`, `truncate`, `db push --force-reset`, atau migration yang menjatuhkan kolom lama selama rekonsiliasi.
