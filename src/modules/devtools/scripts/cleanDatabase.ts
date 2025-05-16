import prisma from '../../../config/prisma';
import logger from '../../../utils/logger';

/**
 * Limpia todas las entidades de la base de datos, respetando
 * las restricciones de llaves foráneas
 */
export const cleanDatabase = async () => {
  try {
    logger.info('Iniciando limpieza de la base de datos...');

    // Eliminamos primero las entidades con dependencias
    logger.info('Eliminando mensajes...');
    await prisma.message.deleteMany();

    logger.info('Eliminando actividades...');
    await prisma.activity.deleteMany();

    logger.info('Eliminando miembros de chat...');
    await prisma.chatMember.deleteMany();

    logger.info('Eliminando relaciones usuario-simulación...');
    await prisma.userSimulation.deleteMany();

    logger.info('Eliminando proyectos...');
    await prisma.project.deleteMany();

    // Ahora eliminamos las entidades de nivel superior
    logger.info('Eliminando chats...');
    await prisma.chat.deleteMany();

    logger.info('Eliminando simulaciones...');
    await prisma.simulation.deleteMany();

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
