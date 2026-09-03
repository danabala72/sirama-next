import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  connectionLimit: 5,
});

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = prismaGlobal.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") prismaGlobal.prisma = prisma;
