import {
  ChatType,
  SimulationType,
  SimulationStatus,
  ActivityType
} from '@prisma/client';

export const mockUsers = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // Contraseña encriptada de ejemplo
    role: 'participant'
  },
  {
    id: '2',
    name: 'María López',
    email: 'maria@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    role: 'participant'
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    role: 'admin'
  }
];

export const mockSimulations = [
  {
    id: '1',
    name: 'Simulación Frontend',
    description: 'Desarrollo de interfaz de usuario para aplicación web',
    type: SimulationType.OPEN,
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-10-01'),
    status: SimulationStatus.ACTIVE
  },
  {
    id: '2',
    name: 'Simulación Backend',
    description: 'Desarrollo de API REST para aplicación móvil',
    type: SimulationType.COMPANY,
    startDate: new Date('2023-10-15'),
    endDate: new Date('2023-11-15'),
    status: SimulationStatus.DRAFT
  }
];

export const mockUserSimulations = [
  {
    id: '1',
    userId: '1',
    simulationId: '1',
    role: 'frontend',
    vertical: 'web',
    joinedAt: new Date('2023-09-01')
  },
  {
    id: '2',
    userId: '2',
    simulationId: '1',
    role: 'backend',
    vertical: 'web',
    joinedAt: new Date('2023-09-01')
  },
  {
    id: '3',
    userId: '1',
    simulationId: '2',
    role: 'frontend',
    vertical: 'mobile',
    joinedAt: new Date('2023-10-15')
  }
];

export const mockProjects = [
  {
    id: '1',
    name: 'Proyecto E-Commerce',
    description: 'Tienda online para venta de productos electrónicos',
    simulationId: '1'
  },
  {
    id: '2',
    name: 'Proyecto Red Social',
    description: 'Aplicación de red social para profesionales',
    simulationId: '2'
  }
];

export const mockChats = [
  {
    id: '1',
    name: 'General',
    type: ChatType.GROUP
  },
  {
    id: '2',
    name: null, // Chat individual no tiene nombre
    type: ChatType.INDIVIDUAL
  }
];

export const mockChatMembers = [
  {
    id: '1',
    userId: '1',
    chatId: '1'
  },
  {
    id: '2',
    userId: '2',
    chatId: '1'
  },
  {
    id: '3',
    userId: '1',
    chatId: '2'
  },
  {
    id: '4',
    userId: '3',
    chatId: '2'
  }
];

export const mockMessages = [
  {
    id: '1',
    content: 'Hola a todos',
    senderId: '1',
    chatId: '1',
    replyToId: null,
    createdAt: new Date('2023-09-05T10:00:00Z')
  },
  {
    id: '2',
    content: 'Hola Juan',
    senderId: '2',
    chatId: '1',
    replyToId: '1',
    createdAt: new Date('2023-09-05T10:05:00Z')
  },
  {
    id: '3',
    content: 'Hola admin',
    senderId: '1',
    chatId: '2',
    replyToId: null,
    createdAt: new Date('2023-09-06T09:00:00Z')
  }
];

export const mockActivities = [
  {
    id: '1',
    userId: '1',
    simulationId: '1',
    type: ActivityType.JOIN_MEET,
    details: 'Joined daily standup meeting',
    timestamp: new Date('2023-09-02T09:00:00Z')
  },
  {
    id: '2',
    userId: '2',
    simulationId: '1',
    type: ActivityType.UPLOAD_DELIVERABLE,
    details: 'Uploaded UI mockups',
    timestamp: new Date('2023-09-03T15:30:00Z')
  }
];
