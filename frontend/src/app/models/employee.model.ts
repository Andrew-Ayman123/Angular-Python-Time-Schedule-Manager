export interface Employee {
  id: string;
  name: string;
  skills: string[];
  maxHours: number;
  availabilityStart: string; // ISO timestamp format: 2025-07-01T08:00:00
  availabilityEnd: string;   // ISO timestamp format: 2025-07-14T22:00:00
}

export interface Shift {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  requiredSkills: string[];
  assignedEmployeeId?: string;
}

export interface ScheduleEntry {
  shift: Shift;
  employee?: Employee;
}
