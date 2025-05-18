import { Request, Response } from 'express';
import { matchingService } from './matchingService';
import { SkillCategory, ProficiencyLevel } from '@prisma/client';

export const matchingController = {
  async generateTeamMatch(req: Request, res: Response) {
    try {
      const { simulationId } = req.params;
      const criteria = req.body;

      // Validaciones básicas
      if (!criteria.projectId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un projectId en los criterios'
        });
      }

      if (
        !criteria.requiredRoles ||
        !Array.isArray(criteria.requiredRoles) ||
        criteria.requiredRoles.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren roles para el matching'
        });
      }

      const result = await matchingService.generateTeamMatch(
        simulationId,
        criteria
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error al generar matching de equipo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar matching de equipo',
        error: error.message
      });
    }
  },

  async suggestUsersForRole(req: Request, res: Response) {
    try {
      const { simulationId, role } = req.params;
      const { requiredSkills } = req.body;

      const users = await matchingService.suggestUsersForRole(
        simulationId,
        role,
        requiredSkills
      );

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      console.error('Error al sugerir usuarios para rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error al sugerir usuarios para rol',
        error: error.message
      });
    }
  },

  async calculateUserProjectCompatibility(req: Request, res: Response) {
    try {
      const { userId, projectId } = req.params;

      const compatibility =
        await matchingService.calculateUserProjectCompatibility(
          userId,
          projectId
        );

      res.status(200).json({
        success: true,
        data: compatibility
      });
    } catch (error: any) {
      console.error('Error al calcular compatibilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error al calcular compatibilidad',
        error: error.message
      });
    }
  }
};
