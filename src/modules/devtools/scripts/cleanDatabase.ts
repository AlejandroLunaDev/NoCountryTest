import prisma from '../../../config/prisma';
import logger from '../../../utils/logger';

/**
 * Limpia todas las entidades de la base de datos, respetando
 * las restricciones de llaves foráneas
 */
export const cleanDatabase = async () => {
  try {
    logger.info('Iniciando limpieza de la base de datos...');

    // 1. Eliminamos primero las entidades con más dependencias
    logger.info('Eliminando notificaciones...');
    await prisma.notification.deleteMany();

    logger.info('Eliminando mensajes...');
    await prisma.message.deleteMany();

    logger.info('Eliminando estados de usuario en chats...');
    await prisma.chatUserState.deleteMany();

    logger.info('Eliminando actividades...');
    await prisma.activity.deleteMany();

    logger.info('Eliminando miembros de chat...');
    await prisma.chatMember.deleteMany();

    logger.info('Eliminando relaciones usuario-simulación...');
    await prisma.userSimulation.deleteMany();

    logger.info('Eliminando proyectos...');
    await prisma.project.deleteMany();

    // 2. Ahora eliminamos las entidades de nivel intermedio
    logger.info('Eliminando chats...');
    await prisma.chat.deleteMany();

    logger.info('Eliminando simulaciones...');
    await prisma.simulation.deleteMany();

    // 3. Finalmente eliminamos las entidades principales
    logger.info('Eliminando usuarios...');
    await prisma.user.deleteMany();

    logger.info('Base de datos limpiada exitosamente.');
  } catch (error) {
    logger.error('Error al limpiar la base de datos:', { error });
    throw error;
  }
};

// Exportamos una función para ejecutar directamente desde consola si es necesario
if (require.main === module) {
  cleanDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error al ejecutar limpieza:', error);
      process.exit(1);
    });
}
