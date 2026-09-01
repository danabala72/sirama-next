# SIRAMA Next

Refactor bertahap aplikasi SIRAMA Laravel ke Next.js App Router dan Prisma tanpa menghapus data lama.

## Prinsip utama

- Database MySQL lama adalah sumber data selama masa transisi.
- Nama tabel dan kolom dipertahankan melalui mapping Prisma.
- Laravel tetap dapat berjalan sebagai pembanding dan jalur rollback.
- Duplikasi transfer_sks ditangani melalui rekonsiliasi, bukan dihapus langsung.
