import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'No Country API',
      version,
      description:
        'API para la plataforma de No Country con funcionalidades de comunicación interna y simulaciones laborales',
      license: {
        name: 'ISC'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      schemas: {
        // User Schema
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // Chat Schema
        Chat: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['INDIVIDUAL', 'GROUP', 'SUBGROUP'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // Message Schema
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            senderId: { type: 'string', format: 'uuid' },
            chatId: { type: 'string', format: 'uuid' },
            replyToId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // Simulation Schema
        Simulation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['OPEN', 'COMPANY'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // Activity Schema
        Activity: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            simulationId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: [
                'LOGIN',
                'JOIN_MEET',
                'SEND_MESSAGE',
                'UPLOAD_DELIVERABLE',
                'COMPLETE_TASK'
              ]
            },
            details: { type: 'string', nullable: true },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        // Error response
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        // Success response
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Datos inválidos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Chats',
        description: 'Operaciones relacionadas con chats'
      },
      {
        name: 'Messages',
        description: 'Operaciones relacionadas con mensajes'
      },
      {
        name: 'Simulations',
        description: 'Operaciones relacionadas con simulaciones laborales'
      },
      {
        name: 'DevTools',
        description: 'Herramientas de desarrollo y mantenimiento'
      }
    ]
  },
  apis: ['./src/modules/*/routes/*.ts', './src/modules/*/controllers/*.ts']
};

export const specs = swaggerJsdoc(options);
