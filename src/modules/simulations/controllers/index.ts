import { Request, Response } from 'express';
import { simulationService } from '../services';
import { activityService } from '../services/activity';
import { ActivityType, SimulationStatus } from '@prisma/client';
import prisma from '../../../config/prisma';

// Tipo de proyecto (temporal hasta que se genere en Prisma)
enum ProjectType {
  OPEN = 'OPEN',
  COMPANY = 'COMPANY'
}

export const simulationController = {
  async createSimulation(req: Request, res: Response) {
    try {
      const simulationData = req.body;

      // Validar fechas
      const startDate = new Date(simulationData.startDate);
      const endDate = new Date(simulationData.endDate);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message:
            'La fecha de finalización debe ser posterior a la fecha de inicio'
        });
      }

      // Crear la simulación
      const simulation = await simulationService.createSimulation({
        ...simulationData,
        startDate,
        endDate
      });

      res.status(201).json({
        success: true,
        data: simulation
      });
    } catch (error: any) {
      console.error('Error al crear simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear simulación',
        error: error.message
      });
    }
  },

  async getSimulationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const simulation = await simulationService.getSimulationById(id);

      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      res.status(200).json({
        success: true,
        data: simulation
      });
    } catch (error: any) {
      console.error('Error al obtener simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener simulación',
        error: error.message
      });
    }
  },

  async enrollUser(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;
      const { userId, role, vertical } = req.body;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Inscribir al usuario
      const enrollment = await simulationService.enrollUser({
        userId,
        simulationId,
        role,
        vertical
      });

      // Registrar actividad
      await activityService.recordActivity({
        userId,
        simulationId,
        type: ActivityType.JOIN_MEET,
        details: `User enrolled in simulation with role ${role} and vertical ${vertical}`
      });

      res.status(201).json({
        success: true,
        data: enrollment
      });
    } catch (error: any) {
      console.error('Error al inscribir usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al inscribir usuario',
        error: error.message
      });
    }
  },

  async createProject(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;
      const {
        name,
        description,
        projectType = ProjectType.OPEN,
        companyId,
        requirements,
        scope,
        resources
      } = req.body;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Crear el proyecto
      const project = await simulationService.createProject({
        name,
        description,
        simulationId,
        projectType,
        companyId,
        requirements,
        scope,
        resources
      });

      res.status(201).json({
        success: true,
        data: project
      });
    } catch (error: any) {
      console.error('Error al crear proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear proyecto',
        error: error.message
      });
    }
  },

  async getSimulations(req: Request, res: Response) {
    try {
      const { userId, companyId, status, limit, offset } = req.query;

      const queryParams: any = {};

      if (userId) queryParams.userId = userId as string;
      if (companyId) queryParams.companyId = companyId as string;
      if (status) queryParams.status = status as string;
      if (limit) queryParams.limit = parseInt(limit as string);
      if (offset) queryParams.offset = parseInt(offset as string);

      const simulations = await simulationService.getSimulations(queryParams);

      res.status(200).json({
        success: true,
        data: simulations
      });
    } catch (error: any) {
      console.error('Error al obtener simulaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener simulaciones',
        error: error.message
      });
    }
  },

  async closeSimulation(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(id);
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Cerrar la simulación
      const result = await simulationService.closeSimulation(id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error al cerrar simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cerrar simulación',
        error: error.message
      });
    }
  },

  async getSimulationActivity(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;
      const { userId, type, startDate, endDate, limit, offset } = req.query;

      const queryParams: any = {};

      if (userId) queryParams.userId = userId as string;
      if (type) queryParams.type = type as ActivityType;
      if (startDate) queryParams.startDate = new Date(startDate as string);
      if (endDate) queryParams.endDate = new Date(endDate as string);
      if (limit) queryParams.limit = parseInt(limit as string);
      if (offset) queryParams.offset = parseInt(offset as string);

      const activities = await activityService.getActivityBySimulation(
        simulationId,
        queryParams
      );

      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error: any) {
      console.error('Error al obtener actividades de la simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener actividades de la simulación',
        error: error.message
      });
    }
  },

  async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { simulationId, type, startDate, endDate, limit, offset } =
        req.query;

      const queryParams: any = {};

      if (simulationId) queryParams.simulationId = simulationId as string;
      if (type) queryParams.type = type as ActivityType;
      if (startDate) queryParams.startDate = new Date(startDate as string);
      if (endDate) queryParams.endDate = new Date(endDate as string);
      if (limit) queryParams.limit = parseInt(limit as string);
      if (offset) queryParams.offset = parseInt(offset as string);

      const activities = await activityService.getActivityByUser(
        userId,
        queryParams
      );

      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error: any) {
      console.error('Error al obtener actividades del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener actividades del usuario',
        error: error.message
      });
    }
  },

  async getActivityStats(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;

      const stats = await activityService.getActivityStats(simulationId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de actividad',
        error: error.message
      });
    }
  },

  async createWeeklySchedule(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;
      const scheduleData = req.body;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Validar semana dentro del rango 1-5
      if (scheduleData.weekNumber < 1 || scheduleData.weekNumber > 5) {
        return res.status(400).json({
          success: false,
          message: 'El número de semana debe estar entre 1 y 5'
        });
      }

      // Validar fechas
      const startDate = new Date(scheduleData.startDate);
      const endDate = new Date(scheduleData.endDate);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message:
            'La fecha de finalización debe ser posterior a la fecha de inicio'
        });
      }

      // Crear el cronograma
      const schedule = await simulationService.createWeeklySchedule({
        ...scheduleData,
        simulationId
      });

      res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error: any) {
      console.error('Error al crear cronograma semanal:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cronograma semanal',
        error: error.message
      });
    }
  },

  async getWeeklySchedules(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Obtener todos los cronogramas
      const schedules = await simulationService.getWeeklySchedule(simulationId);

      res.status(200).json({
        success: true,
        data: schedules
      });
    } catch (error: any) {
      console.error('Error al obtener cronogramas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener cronogramas',
        error: error.message
      });
    }
  },

  async getWeeklyScheduleByWeek(req: Request, res: Response) {
    try {
      const { simulationId, weekNumber } = req.params;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Obtener el cronograma específico
      const schedule = await simulationService.getWeeklySchedule(
        simulationId,
        parseInt(weekNumber)
      );

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Cronograma no encontrado para la semana especificada'
        });
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error: any) {
      console.error('Error al obtener cronograma semanal:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener cronograma semanal',
        error: error.message
      });
    }
  },

  async createTeam(req: Request, res: Response) {
    try {
      const { simulationId, projectId } = req.params;
      const { name, members } = req.body;

      // Validar que la simulación exista
      const simulation = await simulationService.getSimulationById(
        simulationId
      );
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }

      // Validar que el proyecto exista y pertenezca a la simulación
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          simulationId
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado en esta simulación'
        });
      }

      // Crear el equipo
      const team = await simulationService.createTeam({
        projectId,
        name,
        members
      });

      res.status(201).json({
        success: true,
        data: team
      });
    } catch (error: any) {
      console.error('Error al crear equipo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear equipo',
        error: error.message
      });
    }
  }
};
