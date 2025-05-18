import prisma from '../../../../config/prisma';
import { IScheduleService } from '../../interfaces/IScheduleService';
import { CreateScheduleDTO } from '../../types';

class ScheduleService implements IScheduleService {
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
  }

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
  }
}

export const scheduleService = new ScheduleService();
