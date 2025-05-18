import { EnrollUserDTO } from '../types';

export interface IEnrollmentService {
  enrollUser(data: EnrollUserDTO): Promise<any>;
  getUsersBySimulationId(simulationId: string): Promise<any>;
  getSimulationsByUserId(userId: string): Promise<any>;
}
