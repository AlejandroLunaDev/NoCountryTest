// Servicios
import { simulationService } from './modules/core/simulationService';
import { scheduleService } from './modules/schedules/scheduleService';
import { projectService } from './modules/projects/projectService';
import { teamService } from './modules/teams/teamService';
import { enrollmentService } from './modules/enrollment/enrollmentService';
import { matchingService } from './modules/matching/matchingService';

// Rutas
import simulationRoutes from './routes';
import matchingRoutes from './modules/matching/matchingRoutes';

export {
  // Servicios
  simulationService,
  scheduleService,
  projectService,
  teamService,
  enrollmentService,
  matchingService,

  // Rutas
  simulationRoutes,
  matchingRoutes
};

export default {
  routes: {
    main: simulationRoutes,
    matching: matchingRoutes
  }
};
