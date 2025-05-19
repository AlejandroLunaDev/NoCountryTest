# No Country - Plataforma Core Backend

API backend para la plataforma NoCountry, implementando las funcionalidades de Comunicación Interna y Lógica de Simulaciones Laborales.

## Tecnologías utilizadas

- **Backend**: TypeScript, Node.js, Express
- **Base de datos**: PostgreSQL con Supabase
- **ORM**: Prisma
- **Comunicación en tiempo real**: Socket.io

## Justificación de funcionalidades implementadas

Se eligieron las siguientes funcionalidades:

1. **Comunicación Interna**: Es la base de la interacción entre los usuarios y fundamental para la colaboración en equipos remotos. Se implementó un sistema completo que permite:

   - Crear y enviar mensajes entre usuarios (1 a 1, subgrupal, grupal)
   - Guardar esos mensajes en la base de datos con una estructura escalable
   - Consultar mensajes por tipo de chat y por participante
   - Comunicación en tiempo real con WebSockets
   - Timestamps y respuestas a mensajes

2. **Lógica de Simulaciones Laborales**: Es el núcleo del sistema de validación de No Country. Se implementó:
   - Crear simulaciones laborales con fecha de inicio y fin, tipo y estado
   - Inscribir usuarios a simulaciones con roles y verticales específicas
   - Asignar proyectos a simulaciones
   - Consultar y cerrar simulaciones
   - Registro de actividad dentro de las simulaciones

## Estructura del proyecto

```
src/
├── config/           # Configuración de la aplicación
├── middlewares/      # Middlewares de Express
├── modules/          # Módulos de la aplicación
│   ├── messaging/    # Funcionalidad de comunicación interna
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types.ts
│   └── simulations/  # Funcionalidad de simulaciones laborales
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       └── types.ts
└── utils/            # Utilidades y helpers
```

## Endpoints principales

### Comunicación Interna

- `POST /api/messaging/chats`: Crear un nuevo chat
- `GET /api/messaging/chats/:id`: Obtener detalles de un chat
- `GET /api/messaging/users/:userId/chats`: Obtener chats de un usuario
- `POST /api/messaging/messages`: Crear un mensaje
- `GET /api/messaging/messages`: Consultar mensajes filtrados

### Simulaciones Laborales

- `POST /api/simulations`: Crear una nueva simulación
- `GET /api/simulations`: Obtener lista de simulaciones
- `POST /api/simulations/:simulationId/users`: Inscribir usuario a una simulación
- `POST /api/simulations/:simulationId/projects`: Asignar proyecto a una simulación
- `POST /api/simulations/:id/close`: Cerrar una simulación
- `GET /api/simulations/:simulationId/activity`: Consultar actividad de una simulación

## Funcionalidades WebSocket

Se implementó Socket.io para la comunicación en tiempo real:

- Notificación de nuevos mensajes
- Indicador de usuario escribiendo
- Actualización inmediata de estado de chats

## Configuración del proyecto

1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Configura las variables de entorno en un archivo `.env`:
   ```
   PORT=3000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:password@localhost:5432/nocountry"
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
4. Genera el cliente Prisma: `npx prisma generate`
5. Ejecuta las migraciones: `npx prisma migrate dev`
6. Inicia el servidor:
   - Desarrollo: `npm run dev`
   - Producción: `npm run build && npm start`

## Escalabilidad y próximos pasos

- Implementación de autenticación y autorización
- Integración con servicios externos (Google Meet)
- Análisis de datos y generación de reportes
- Implementación de pruebas automatizadas
