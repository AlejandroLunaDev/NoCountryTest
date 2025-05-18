import { Router } from 'express';
import { matchingController } from './matchingController';

const router = Router();

/**
 * @swagger
 * /api/simulations/{simulationId}/matching/teams:
 *   post:
 *     summary: Generar matching automático para crear un equipo
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - requiredRoles
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del proyecto para el cual crear equipo
 *               requiredRoles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - count
 *                   properties:
 *                     role:
 *                       type: string
 *                       description: Rol requerido (ej. FRONTEND, BACKEND, etc.)
 *                     count:
 *                       type: integer
 *                       description: Número de personas necesarias para este rol
 *                     requiredSkills:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             enum: [FRONTEND, BACKEND, DATABASE, DEVOPS, MOBILE, DESIGN, TESTING, PROJECT_MANAGEMENT, OTHERS]
 *                           minProficiencyLevel:
 *                             type: string
 *                             enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *               balanceExperience:
 *                 type: boolean
 *                 default: true
 *                 description: Si debe equilibrar la experiencia en el equipo
 *               preferSameVertical:
 *                 type: boolean
 *                 default: true
 *                 description: Si debe preferir usuarios de la misma vertical
 *     responses:
 *       201:
 *         description: Equipo creado exitosamente con matching automático
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:simulationId/matching/teams',
  matchingController.generateTeamMatch
);

/**
 * @swagger
 * /api/simulations/{simulationId}/matching/roles/{role}/suggestions:
 *   post:
 *     summary: Sugerir usuarios para un rol específico
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *       - in: path
 *         name: role
 *         schema:
 *           type: string
 *         required: true
 *         description: Rol a buscar (ej. "FRONTEND", "BACKEND", etc.)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       enum: [FRONTEND, BACKEND, DATABASE, DEVOPS, MOBILE, DESIGN, TESTING, PROJECT_MANAGEMENT, OTHERS]
 *                     minProficiencyLevel:
 *                       type: string
 *                       enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *     responses:
 *       200:
 *         description: Lista de usuarios sugeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:simulationId/matching/roles/:role/suggestions',
  matchingController.suggestUsersForRole
);

/**
 * @swagger
 * /api/simulations/matching/users/{userId}/projects/{projectId}/compatibility:
 *   get:
 *     summary: Calcular la compatibilidad de un usuario con un proyecto
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del usuario
 *       - in: path
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Puntuación de compatibilidad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/matching/users/:userId/projects/:projectId/compatibility',
  matchingController.calculateUserProjectCompatibility
);

export default router;
