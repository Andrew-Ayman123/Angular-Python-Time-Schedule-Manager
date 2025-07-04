import { Shift } from './shift.model';
import { Employee } from './employee.model';

export interface ScheduleEntry {
  shift: Shift;
  employee?: Employee;
}
