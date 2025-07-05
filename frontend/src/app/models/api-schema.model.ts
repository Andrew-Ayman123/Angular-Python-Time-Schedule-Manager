// API Schema interfaces for backend communication
// These interfaces define the structure of data exchanged with the backend API

import { Employee } from './employee.model';
import { Shift } from './shift.model';
import { ScheduleEntryWithId } from './schedule-entry.model';

/**
 * API representation of an Employee for requests/responses
 */
export interface EmployeeAPI {
  id: string;
  name: string;
  skills: string[];
  max_hours: number;
  availability: {
    start: string; // ISO string format
    end: string;   // ISO string format
  };
}

/**
 * API representation of a Shift for requests/responses
 */
export interface ShiftAPI {
  id: string;
  role: string;
  start_time: string; // ISO string format for API
  end_time: string;   // ISO string format for API
  required_skill: string; // Note: singular 'required_skill' as requested
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface OptimizeRequest {
  period: string;
  employees: EmployeeAPI[];
  shifts: ShiftAPI[];
  current_assignments: ScheduleEntryWithId[];
  constraints: string[];
}

export interface Metrics {
  total_overtime_minutes: number;
  constraint_violations: number;
  optimization_time_ms: number;
  objective_value: number;
}

export interface OptimizeResponse {
  success: boolean;
  assignments: ScheduleEntryWithId[];
  unassigned_shifts: string[];
  metrics: Metrics;
  constraints_applied: string[];
  message?: string;
}

export enum ConstraintType {
  SKILL_MATCHING = "skill_matching",
  OVERTIME_LIMITS = "overtime_limits",
  AVAILABILITY_WINDOWS = "availability_windows",
  NO_OVERLAPPING = "no_overlapping"
}
