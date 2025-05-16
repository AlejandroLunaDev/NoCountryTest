export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryUsersDTO {
  role?: string;
  email?: string;
  limit?: number;
  offset?: number;
}