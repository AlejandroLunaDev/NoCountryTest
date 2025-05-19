import prisma from '../../../config/prisma';
import {
  CreateSimulationDTO,
  EnrollUserDTO,
  CreateProjectDTO,
  QuerySimulationsDTO,
  CreateScheduleDTO,
  CreateTaskDTO,
  CreateMeetingDTO,
  CreateDeliverableDTO,
  CloseSimulationDTO,
  CreateTeamDTO
} from '../types';
import { SimulationStatus, ProjectType } from '@prisma/client';
import { addWeeks, addDays } from 'date-fns';

export const simulationService = {
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
                role: true,
                profileType: true,
                experienceYears: true
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
  },

  async enrollUser(data: EnrollUserDTO) {
    const { userId, simulationId, role, vertical, experienceYears } = data;

    // Primero, actualizar información técnica del usuario si se proporcionó
    if (experienceYears !== undefined) {
      const updateData: any = {};

      if (experienceYears !== undefined) {
        updateData.experienceYears = experienceYears;
      }

      // Actualizar el perfil técnico del usuario
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          profileType: role // Asumimos que el rol funciona como profileType
        }
      });
    }

    // Luego inscribir al usuario en la simulación
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
            role: true,
            profileType: true,
            experienceYears: true
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
    const {
      name,
      description,
      simulationId,
      projectType,
      companyId,
      requirements,
      scope,
      resources
    } = data;

    return prisma.project.create({
      data: {
        name,
        description,
        simulationId,
        projectType,
        companyId,
        requirements,
        scope,
        resources: resources ? resources : undefined
      }
    });
  },

  async createTeam(data: CreateTeamDTO) {
    const { projectId, name, members } = data;

    // Crear el equipo
    const team = await prisma.projectTeam.create({
      data: {
        projectId,
        name
      }
    });

    // Agregar miembros al equipo
    for (const member of members) {
      await prisma.projectTeamMember.create({
        data: {
          teamId: team.id,
          userId: member.userId,
          role: member.role
        }
      });
    }

    return prisma.projectTeam.findUnique({
      where: { id: team.id },
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
  },

  async createWeeklySchedule(data: CreateScheduleDTO) {
    const {
      simulationId,
      weekNumber,
      startDate,
      endDate,
      theme,
      objectives,
      tasks,
      meetings,
      deliverables
    } = data;

    // Crear el cronograma semanal
    const schedule = await prisma.weeklySchedule.create({
      data: {
        simulationId,
        weekNumber,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        theme,
        objectives
      }
    });

    // Agregar tareas si se proporcionaron
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        await prisma.task.create({
          data: {
            weeklyScheduleId: schedule.id,
            title: task.title,
            description: task.description,
            dueDate: new Date(task.dueDate),
            assignedRoles: task.assignedRoles
          }
        });
      }
    }

    // Agregar reuniones si se proporcionaron
    if (meetings && meetings.length > 0) {
      for (const meeting of meetings) {
        await prisma.meeting.create({
          data: {
            weeklyScheduleId: schedule.id,
            title: meeting.title,
            description: meeting.description,
            dateTime: new Date(meeting.dateTime),
            duration: meeting.duration,
            isRequired: meeting.isRequired ?? true
          }
        });
      }
    }

    // Agregar entregables si se proporcionaron
    if (deliverables && deliverables.length > 0) {
      for (const deliverable of deliverables) {
        await prisma.deliverable.create({
          data: {
            weeklyScheduleId: schedule.id,
            title: deliverable.title,
            description: deliverable.description,
            dueDate: new Date(deliverable.dueDate),
            assignedRoles: deliverable.assignedRoles
          }
        });
      }
    }

    // Retornar el cronograma con todos sus elementos
    return prisma.weeklySchedule.findUnique({
      where: { id: schedule.id },
      include: {
        tasks: true,
        meetings: true,
        deliverables: true
      }
    });
  },

  async getWeeklySchedule(simulationId: string, weekNumber?: number) {
    if (weekNumber) {
      // Obtener cronograma específico
      return prisma.weeklySchedule.findUnique({
        where: {
          simulationId_weekNumber: {
            simulationId,
            weekNumber
          }
        },
        include: {
          tasks: true,
          meetings: true,
          deliverables: true
        }
      });
    } else {
      // Obtener todos los cronogramas de la simulación
      return prisma.weeklySchedule.findMany({
        where: { simulationId },
        include: {
          tasks: true,
          meetings: true,
          deliverables: true
        },
        orderBy: {
          weekNumber: 'asc'
        }
      });
    }
  },

  async updateSimulationStatus(id: string, status: SimulationStatus) {
    return prisma.simulation.update({
      where: { id },
      data: {
        status
      }
    });
  },

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
};
