import { PrismaClient } from '@prisma/client';

// Crear una única instancia del cliente Prisma
const prisma = new PrismaClient();

export default prisma;
