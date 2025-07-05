import { Shift } from './shift.model';
import { Employee } from './employee.model';

export interface ScheduleEntry {
  shift: Shift;
  employee?: Employee;
}

export interface ScheduleEntryWithId {
  shiftId: string; // Unique identifier for the shift
  employeeId: string; 
}
