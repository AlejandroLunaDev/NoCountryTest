import prisma from '../../../../config/prisma';
import { SimulationStatus } from '@prisma/client';
import { addWeeks, addDays } from 'date-fns';
import { ISimulationService } from '../../interfaces/ISimulationService';
import {
  CreateSimulationDTO,
  QuerySimulationsDTO,
  CloseSimulationDTO
} from '../../types';

class SimulationService implements ISimulationService {
  async createSimulation(data: CreateSimulationDTO) {
    const { name, description, type, startDate, endDate, status, companyId } =
      data;

    // Calcular fecha de finalización automáticamente (5 semanas desde inicio)
    const calculatedEndDate = addWeeks(new Date(startDate), 5);

    // Crear la simulación
    const simulation = await prisma.simulation.create({
      data: {
        name,
        description,
        type,
        startDate: new Date(startDate),
        endDate: calculatedEndDate, // Usamos la fecha calculada, ignorando la proporcionada
        status,
        companyId
      }
    });

    // Crear automáticamente el cronograma de 5 semanas
    for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
      const weekStart = addDays(new Date(startDate), (weekNumber - 1) * 7);
      const weekEnd = addDays(weekStart, 6);

      await prisma.weeklySchedule.create({
        data: {
          simulationId: simulation.id,
          weekNumber,
          startDate: weekStart,
          endDate: weekEnd,
          theme: `Semana ${weekNumber}`
        }
      });
    }

    return simulation;
  }

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
                role: true,
                profileType: true,
                experienceYears: true,
                userSkills: {
                  include: {
                    skill: true
                  }
                }
              }
            }
          }
        },
        projects: {
          include: {
            teams: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        profileType: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        schedules: {
          include: {
            tasks: true,
            meetings: true,
            deliverables: true
          }
        }
      }
    });
  }

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
                name: true,
                profileType: true
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            projectType: true
          }
        },
        schedules: {
          select: {
            id: true,
            weekNumber: true,
            theme: true
          }
        }
      }
    });
  }

  async updateSimulationStatus(id: string, status: SimulationStatus) {
    return prisma.simulation.update({
      where: { id },
      data: {
        status
      }
    });
  }

  async closeSimulation(id: string, data?: CloseSimulationDTO) {
    // Marcar la simulación como completada
    await this.updateSimulationStatus(id, SimulationStatus.COMPLETED);

    // Obtener todos los datos relevantes de la simulación
    const simulationData = await prisma.simulation.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileType: true
              }
            }
          }
        },
        projects: {
          include: {
            teams: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        activities: {
          select: {
            id: true,
            type: true,
            timestamp: true,
            userId: true,
            details: true
          }
        },
        schedules: {
          include: {
            tasks: true,
            meetings: true,
            deliverables: true
          }
        }
      }
    });

    // Calcular métricas
    const userCount = simulationData?.users.length || 0;
    const projectCount = simulationData?.projects.length || 0;
    const activityCount = simulationData?.activities.length || 0;

    // Calcular participación por usuario
    const userParticipation: Record<string, any> = {};

    simulationData?.activities.forEach(activity => {
      if (!userParticipation[activity.userId]) {
        userParticipation[activity.userId] = {
          count: 0,
          types: {}
        };
      }

      userParticipation[activity.userId].count++;

      if (!userParticipation[activity.userId].types[activity.type]) {
        userParticipation[activity.userId].types[activity.type] = 0;
      }

      userParticipation[activity.userId].types[activity.type]++;
    });

    // Crear métricas para el informe
    const metrics = {
      participants: userCount,
      projects: projectCount,
      activities: activityCount,
      userParticipation,
      // Incluir métricas adicionales si se proporcionaron
      ...(data?.metrics || {})
    };

    // Crear o actualizar el informe final
    const report = await prisma.simulationReport.upsert({
      where: {
        simulationId: id
      },
      update: {
        metrics,
        conclusions: data?.conclusions
      },
      create: {
        simulationId: id,
        metrics,
        conclusions: data?.conclusions
      }
    });

    return {
      simulation: simulationData,
      report,
      closedAt: new Date()
    };
  }
}

export const simulationService = new SimulationService();
