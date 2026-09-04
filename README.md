# SIRAMA Next

Refactor bertahap aplikasi SIRAMA Laravel ke Next.js App Router dan Prisma tanpa menghapus data lama.

## Prinsip utama

- Database MySQL lama adalah sumber data selama masa transisi.
- Nama tabel dan kolom dipertahankan melalui mapping Prisma.
- Laravel tetap dapat berjalan sebagai pembanding dan jalur rollback.
- Duplikasi transfer_sks ditangani melalui rekonsiliasi, bukan dihapus langsung.

## Docker staging

Stack menjalankan Next.js pada port `3107` dan MySQL 8.4 pada port `3317`.
Data MySQL disimpan permanen di volume `sirama_staging_mysql_data`. Stack tidak
menjalankan Prisma migration, `db push`, atau reset otomatis.

```bash
cp .env.docker.example .env.docker
# Ganti password dan SESSION_SECRET pada .env.docker
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

Aplikasi tersedia di `http://localhost:3107`. Restore dump lama hanya ke
database staging:

```bash
gunzip -c websirama_sirama.sql.gz | \
  docker compose --env-file .env.docker exec -T mysql \
  mysql -usirama -p"PASSWORD_STAGING" sirama_staging
```

Untuk file `.sql` biasa:

```bash
docker compose --env-file .env.docker exec -T mysql \
  mysql -usirama -p"PASSWORD_STAGING" sirama_staging < websirama_sirama.sql
```

Sesudah restore:

```bash
docker compose --env-file .env.docker restart next
docker compose --env-file .env.docker logs -f next
```
