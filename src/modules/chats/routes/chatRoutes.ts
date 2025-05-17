import { Router } from 'express';
import { chatController } from '../controllers/chatController';

const router = Router();

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Crear un nuevo chat
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - memberIds
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del chat (opcional para chats individuales)
 *               type:
 *                 type: string
 *                 enum: [INDIVIDUAL, GROUP, SUBGROUP]
 *                 description: Tipo de chat
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: IDs de los usuarios miembros del chat
 *     responses:
 *       201:
 *         description: Chat creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', chatController.createChat);

/**
 * @swagger
 * /api/chats/{id}:
 *   get:
 *     summary: Obtener un chat por su ID
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del chat
 *     responses:
 *       200:
 *         description: Chat encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', chatController.getChatById);

/**
 * @swagger
 * /api/chats/users/{userId}:
 *   get:
 *     summary: Obtener todos los chats de un usuario
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Lista de chats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/users/:userId', chatController.getUserChats);

/**
 * @swagger
 * /api/chats/{chatId}/members:
 *   post:
 *     summary: Agregar un miembro a un chat
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario a agregar
 *     responses:
 *       201:
 *         description: Miembro agregado exitosamente
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
router.post('/:chatId/members', chatController.addMemberToChat);

/**
 * @swagger
 * /api/chats/{id}:
 *   delete:
 *     summary: Eliminar un chat (solo para el usuario que realiza la petición)
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del chat a eliminar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario que solicita la eliminación (idealmente debería venir de la sesión)
 *     responses:
 *       200:
 *         description: Chat eliminado exitosamente (solo para el usuario solicitante)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         description: No tienes permiso para eliminar este chat
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', chatController.deleteChat);

/**
 * @swagger
 * /api/chats/{id}/hard:
 *   delete:
 *     summary: Eliminar un chat permanentemente (borrado físico - solo para administradores)
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del chat a eliminar permanentemente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del administrador
 *               isAdmin:
 *                 type: boolean
 *                 description: Debe ser true para permitir la operación
 *     responses:
 *       200:
 *         description: Chat eliminado permanentemente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         description: Operación no permitida - Se requieren privilegios de administrador
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id/hard', chatController.hardDeleteChat);

export default router;
