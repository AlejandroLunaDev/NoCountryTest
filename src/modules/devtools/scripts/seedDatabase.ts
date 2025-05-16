import prisma from '../../../config/prisma';
import logger from '../../../utils/logger';
import {
  mockUsers,
  mockSimulations,
  mockUserSimulations,
  mockProjects,
  mockChats,
  mockChatMembers,
  mockMessages,
  mockActivities
} from '../mocks/mockData';

/**
 * Poblar la base de datos con datos de prueba
 */
export const seedDatabase = async () => {
  try {
    logger.info('Iniciando proceso de poblado de base de datos...');

    // Insertar usuarios
    logger.info('Insertando usuarios de prueba...');
    await Promise.all(
      mockUsers.map(user =>
        prisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user
        })
      )
    );

    // Insertar simulaciones
    logger.info('Insertando simulaciones de prueba...');
    await Promise.all(
      mockSimulations.map(simulation =>
        prisma.simulation.upsert({
          where: { id: simulation.id },
          update: simulation,
          create: simulation
        })
      )
    );

    // Insertar relaciones usuario-simulación
    logger.info('Insertando relaciones usuario-simulación...');
    await Promise.all(
      mockUserSimulations.map(userSim =>
        prisma.userSimulation.upsert({
          where: { id: userSim.id },
          update: userSim,
          create: userSim
        })
      )
    );

    // Insertar proyectos
    logger.info('Insertando proyectos...');
    await Promise.all(
      mockProjects.map(project =>
        prisma.project.upsert({
          where: { id: project.id },
          update: project,
          create: project
        })
      )
    );

    // Insertar chats
    logger.info('Insertando chats...');
    await Promise.all(
      mockChats.map(chat =>
        prisma.chat.upsert({
          where: { id: chat.id },
          update: chat,
          create: chat
        })
      )
    );

    // Insertar miembros de chat
    logger.info('Insertando miembros de chat...');
    await Promise.all(
      mockChatMembers.map(member =>
        prisma.chatMember.upsert({
          where: { id: member.id },
          update: member,
          create: member
        })
      )
    );

    // Insertar mensajes
    logger.info('Insertando mensajes...');
    await Promise.all(
      mockMessages.map(message =>
        prisma.message.upsert({
          where: { id: message.id },
          update: message,
          create: message
        })
      )
    );

    // Insertar actividades
    logger.info('Insertando actividades...');
    await Promise.all(
      mockActivities.map(activity =>
        prisma.activity.upsert({
          where: { id: activity.id },
          update: activity,
          create: activity
        })
      )
    );

    logger.info('Base de datos poblada exitosamente.');
  } catch (error) {
    logger.error('Error al poblar la base de datos:', { error });
    throw error;
  }
};

// Exportamos una función para ejecutar directamente desde consola si es necesario
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error al ejecutar seed:', error);
      process.exit(1);
    });
}
