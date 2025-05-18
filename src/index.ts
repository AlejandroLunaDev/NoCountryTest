import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { specs } from './config/swagger';
import chatRoutes from './modules/chats/routes/chatRoutes';
import messageRoutes from './modules/messages/routes/messageRoutes';
import simulationsRoutes from './modules/simulations/routes';
import devtoolsRoutes from './modules/devtools/routes';
import userRoutes from './modules/users/routes';
import { setupSocketHandlers } from './modules/socket/socket';
import { initializeNotificationModule } from './modules/notifications';
import { setupChatServiceSocketIO } from './modules/chats/services/chatService';
import { errorHandler } from './middlewares/errorHandler';
import morganMiddleware from './middlewares/morgan';
import logger from './utils/logger';
import simulationModule from './modules/simulations';

// Inicializar Express
const app = express();

// Configuración CORS mejorada
const corsOptions = {
  origin: '*', // Permitir todos los orígenes
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization,X-Requested-With'
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(morganMiddleware); // Registrar solicitudes HTTP

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.IO
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configurar WebSockets para chat
setupSocketHandlers(io);

// Configurar Socket.IO en el servicio de chat
setupChatServiceSocketIO(io);

// Inicializar y configurar el módulo de notificaciones
const { notificationService, notificationIntegrationService } =
  initializeNotificationModule(io);
logger.info('Módulo de notificaciones inicializado');

// Documentación API con Swagger
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

// Rutas API
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/simulations', simulationModule.routes.main);
app.use('/api/simulations', simulationModule.routes.matching);
app.use('/api/devtools', devtoolsRoutes);
app.use('/api/users', userRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.send('No Country API - Prueba técnica');
});

// Middleware para manejo de errores (debe estar después de las rutas)
app.use(errorHandler);

// Iniciar servidor
server.listen(config.port, () => {
  logger.info(`Servidor iniciado`, {
    port: config.port,
    mode: config.nodeEnv,
    docs: `http://localhost:${config.port}/api-docs`
  });
});
