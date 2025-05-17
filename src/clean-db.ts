import { PrismaClient } from '@prisma/client';

// Crear una instancia del cliente Prisma
const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('Iniciando limpieza de la base de datos...');

    // 1. Eliminamos primero las entidades con más dependencias
    console.log('Eliminando notificaciones...');
    await prisma.notification.deleteMany();

    console.log('Eliminando mensajes...');
    await prisma.message.deleteMany();

    console.log('Eliminando estados de usuario en chats...');
    await prisma.chatUserState.deleteMany();

    console.log('Eliminando actividades...');
    await prisma.activity.deleteMany();

    console.log('Eliminando miembros de chat...');
    await prisma.chatMember.deleteMany();

    console.log('Eliminando relaciones usuario-simulación...');
    await prisma.userSimulation.deleteMany();

    console.log('Eliminando proyectos...');
    await prisma.project.deleteMany();

    // 2. Ahora eliminamos las entidades de nivel intermedio
    console.log('Eliminando chats...');
    await prisma.chat.deleteMany();

    console.log('Eliminando simulaciones...');
    await prisma.simulation.deleteMany();

    // 3. Finalmente eliminamos las entidades principales
    console.log('Eliminando usuarios...');
    await prisma.user.deleteMany();

    console.log('Base de datos limpiada exitosamente.');
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error);
    throw error;
  } finally {
    // Cerrar la conexión de Prisma
    await prisma.$disconnect();
  }
}

// Ejecutar la función
cleanDatabase()
  .then(() => {
    console.log('Proceso completado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en el proceso:', error);
    process.exit(1);
  });
