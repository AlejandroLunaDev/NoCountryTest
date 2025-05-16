import { Router } from 'express';
import { messageController } from '../controllers/messageController';

const router = Router();

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Crear un nuevo mensaje
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - senderId
 *               - chatId
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenido del mensaje
 *               senderId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario que envía el mensaje
 *               chatId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del chat donde se envía el mensaje
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del mensaje al que se responde (opcional)
 *     responses:
 *       201:
 *         description: Mensaje creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', messageController.createMessage);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Obtener mensajes con filtros
 *     tags: [Messages]
 *     parameters:
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID del chat
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID del usuario remitente
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de mensajes a retornar
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Lista de mensajes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', messageController.getMessages);

/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Obtener un mensaje por su ID
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Mensaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', messageController.getMessageById);

export default router;
