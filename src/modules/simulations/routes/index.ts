import { Router } from 'express';
import { simulationController } from '../controllers';

const router = Router();

/**
 * @swagger
 * /api/simulations:
 *   post:
 *     summary: Crear una nueva simulación
 *     tags: [Simulations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - startDate
 *               - endDate
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de la simulación
 *               description:
 *                 type: string
 *                 description: Descripción detallada (opcional)
 *               type:
 *                 type: string
 *                 enum: [OPEN, COMPANY]
 *                 description: Tipo de simulación
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de inicio
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de finalización
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, COMPLETED, CANCELLED]
 *                 description: Estado de la simulación
 *     responses:
 *       201:
 *         description: Simulación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', simulationController.createSimulation);

/**
 * @swagger
 * /api/simulations:
 *   get:
 *     summary: Obtener simulaciones con filtros
 *     tags: [Simulations]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID del usuario
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de la empresa
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, COMPLETED, CANCELLED]
 *         description: Filtrar por estado
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número máximo de simulaciones a retornar
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Lista de simulaciones
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', simulationController.getSimulations);

/**
 * @swagger
 * /api/simulations/{id}:
 *   get:
 *     summary: Obtener una simulación por su ID
 *     tags: [Simulations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *     responses:
 *       200:
 *         description: Simulación encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', simulationController.getSimulationById);

/**
 * @swagger
 * /api/simulations/{id}/close:
 *   post:
 *     summary: Cerrar una simulación
 *     tags: [Simulations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *     responses:
 *       200:
 *         description: Simulación cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/close', simulationController.closeSimulation);

/**
 * @swagger
 * /api/simulations/{simulationId}/users:
 *   post:
 *     summary: Inscribir un usuario a una simulación
 *     tags: [Simulations]
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
 *               - userId
 *               - role
 *               - vertical
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario
 *               role:
 *                 type: string
 *                 description: Rol del usuario (backend, frontend, etc.)
 *               vertical:
 *                 type: string
 *                 description: Vertical (web, mobile, etc.)
 *     responses:
 *       201:
 *         description: Usuario inscrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:simulationId/users', simulationController.enrollUser);

/**
 * @swagger
 * /api/simulations/users/{userId}/activity:
 *   get:
 *     summary: Obtener actividad de un usuario
 *     tags: [Simulations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del usuario
 *       - in: query
 *         name: simulationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de simulación
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOGIN, JOIN_MEET, SEND_MESSAGE, UPLOAD_DELIVERABLE, COMPLETE_TASK]
 *         description: Filtrar por tipo de actividad
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar desde fecha
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar hasta fecha
 *     responses:
 *       200:
 *         description: Actividad del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/users/:userId/activity', simulationController.getUserActivity);

/**
 * @swagger
 * /api/simulations/{simulationId}/projects:
 *   post:
 *     summary: Asignar un proyecto a una simulación
 *     tags: [Simulations]
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
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del proyecto
 *               description:
 *                 type: string
 *                 description: Descripción del proyecto
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:simulationId/projects', simulationController.createProject);

/**
 * @swagger
 * /api/simulations/{simulationId}/activity:
 *   get:
 *     summary: Obtener actividad de una simulación
 *     tags: [Simulations]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOGIN, JOIN_MEET, SEND_MESSAGE, UPLOAD_DELIVERABLE, COMPLETE_TASK]
 *         description: Filtrar por tipo de actividad
 *     responses:
 *       200:
 *         description: Actividad de la simulación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:simulationId/activity',
  simulationController.getSimulationActivity
);

/**
 * @swagger
 * /api/simulations/{simulationId}/activity/stats:
 *   get:
 *     summary: Obtener estadísticas de actividad de una simulación
 *     tags: [Simulations]
 *     parameters:
 *       - in: path
 *         name: simulationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID de la simulación
 *     responses:
 *       200:
 *         description: Estadísticas de actividad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:simulationId/activity/stats',
  simulationController.getActivityStats
);

export default router;
