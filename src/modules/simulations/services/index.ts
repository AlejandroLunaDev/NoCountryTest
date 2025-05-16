import prisma from '../../../config/prisma';
import {
  CreateSimulationDTO,
  EnrollUserDTO,
  CreateProjectDTO,
  QuerySimulationsDTO
} from '../types';
import { SimulationStatus } from '@prisma/client';

export const simulationService = {
  async createSimulation(data: CreateSimulationDTO) {
    const { name, description, type, startDate, endDate, status } = data;

    return prisma.simulation.create({
      data: {
        name,
        description,
        type,
        startDate,
        endDate,
        status
      }
    });
  },

  async getSimulationById(id: string) {
    return prisma.simulation.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        projects: true
      }
    });
  },

  async enrollUser(data: EnrollUserDTO) {
    const { userId, simulationId, role, vertical } = data;

    return prisma.userSimulation.create({
      data: {
        userId,
        simulationId,
        role,
        vertical
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        simulation: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      }
    });
  },

  async createProject(data: CreateProjectDTO) {
    const { name, description, simulationId } = data;

    return prisma.project.create({
      data: {
        name,
        description,
        simulationId
      }
    });
  },

  async getSimulations(query: QuerySimulationsDTO) {
    const { userId, companyId, status, limit = 10, offset = 0 } = query;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.users = {
        some: {
          userId
        }
      };
    }

    // La implementación de companyId requeriría extender el modelo para incluir una relación con empresas
    // Este es un ejemplo conceptual
    if (companyId) {
      whereClause.companyId = companyId;
    }

    return prisma.simulation.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: {
        startDate: 'desc'
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  },

  async updateSimulationStatus(id: string, status: SimulationStatus) {
    return prisma.simulation.update({
      where: { id },
      data: {
        status
      }
    });
  },

  async closeSimulation(id: string) {
    // Marcar la simulación como completada
    await this.updateSimulationStatus(id, SimulationStatus.COMPLETED);

    // Generar informe final (esto podría ser un resumen de actividades, proyectos, etc.)
    const simulationData = await prisma.simulation.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        projects: true,
        activities: {
          select: {
            id: true,
            type: true,
            timestamp: true,
            userId: true
          }
        }
      }
    });

    // Aquí se podría implementar lógica para analizar los datos y generar informes
    // Por ejemplo, calcular estadísticas de participación

    return {
      simulation: simulationData,
      closedAt: new Date()
      // Aquí podrían incluirse métricas calculadas
    };
  }
};
