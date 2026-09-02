# Role dan Alur Kerja SIRAMA Next

## Hak akses

| Fungsi | Admin | Admin Jurusan | Mahasiswa | Asesor |
|---|---:|---:|---:|---:|
| Kelola semua jurusan | Ya | Tidak | Tidak | Tidak |
| Kelola semester global | Ya | Lihat aktif | Lihat aktif | Lihat aktif |
| Kelola skema | Semua jurusan | Jurusan sendiri | Lihat miliknya | Lihat penugasan |
| Kelola mata kuliah | Semua jurusan | Jurusan sendiri | Pilih sesuai skema | Lihat yang dipilih |
| Import/export template | Semua jurusan | Jurusan sendiri | Tidak | Tidak |
| Kelola mahasiswa | Semua jurusan | Jurusan sendiri | Data sendiri | Mahasiswa tugasnya |
| Tetapkan tiga asesor | Ya | Jurusan sendiri | Tidak | Tidak |
| Input penilaian | Tidak | Tidak | Asesmen mandiri | Mahasiswa tugasnya |
| Unduh laporan final/formal/nonformal | Ya | Jurusan sendiri | Setelah final | Mahasiswa tugasnya |

## Aturan domain

1. Satu mahasiswa harus ditugaskan tepat kepada tiga asesor berbeda sebelum asesmen dinyatakan lengkap.
2. Admin Jurusan tidak dapat membaca atau mengubah mahasiswa, asesor, skema, maupun mata kuliah dari jurusan lain.
3. Semester aktif bersifat global dan hanya dapat diubah Admin. Pergantian semester dilakukan dalam satu transaksi agar tidak ada dua semester aktif.
4. Skema selalu berada di bawah satu jurusan. Mata kuliah dapat dipasang ke satu atau lebih skema melalui `mata_kuliah_skema`.
5. Mata kuliah yang dipilih mahasiswa menyimpan `mata_kuliah_semester_id`; laporan lama tetap memakai pilihan historis walaupun semester tersebut tidak aktif lagi.
6. Mahasiswa mengisi data diri, pendidikan, mata kuliah, dokumen formal/nonformal, asesmen mandiri, lalu finalisasi. Finalisasi mengunci perubahan hingga dibuka kembali oleh admin yang berwenang.
7. Asesor hanya dapat menilai mahasiswa yang tercatat pada `asesor_mahasiswa`.
8. Nilai formal dan nonformal setiap asesor disimpan terpisah. Nilai final dihitung dari nilai yang tersedia milik tiga asesor, tanpa menganggap `0` sebagai kosong.
9. Export final, formal, dan nonformal harus menggunakan resolver nilai kanonik agar nilai pada transfer duplikat lama tidak hilang dari laporan.

## Import dan export

- Template mahasiswa, NIM, asesor, jurusan, mata kuliah, dan CPMK dipertahankan.
- Import memakai validasi per baris dan transaksi per batch; baris gagal dilaporkan tanpa menghapus data yang sudah ada.
- Untuk Admin Jurusan, `jurusan_id` dari file tidak dipercaya. Sistem selalu memaksakan `jurusan_id` dari sesi pengguna.
- Import tidak boleh menjalankan reset, truncate, atau mengganti nilai lama dengan kolom kosong.
