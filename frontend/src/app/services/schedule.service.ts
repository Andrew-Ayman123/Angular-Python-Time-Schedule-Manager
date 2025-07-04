import { Injectable, signal, inject } from '@angular/core';
import { Employee, Shift, ScheduleEntry } from '../models/index';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private utilsService = inject(UtilsService);
  
  employees = signal<Employee[]>([]);
  shifts = signal<Shift[]>([]);
  schedule = signal<ScheduleEntry[]>([]);
  
  // Mock data for demonstration
  private mockEmployeesData : Employee[] = [
    new Employee({
      id: 'E1',
      name: 'John Doe',
      skills: ['cook', 'cashier'],
      maxHours: 80,
      availabilityStart: new Date('2025-07-01T08:00:00'),
      availabilityEnd: new Date('2025-07-14T22:00:00')
    }),
    new Employee({
      id: 'E2',
      name: 'Jane Smith',
      skills: ['cook'],
      maxHours: 40,
      availabilityStart: new Date('2025-07-01T06:00:00'),
      availabilityEnd: new Date('2025-07-14T18:00:00')
    }),
    new Employee({
      id: 'E3',
      name: 'Mike Johnson',
      skills: ['inventory', 'maintenance'],
      maxHours: 30,
      availabilityStart: new Date('2025-07-03T10:00:00'),
      availabilityEnd: new Date('2025-07-13T20:00:00')
    }),
    new Employee({
      id: 'E4',
      name: 'Sarah Wilson',
      skills: ['cashier', 'customer_service'],
      maxHours: 10,
      availabilityStart: new Date('2025-07-05T12:00:00'),
      availabilityEnd: new Date('2025-07-06T18:00:00')
    }),
    new Employee({
      id: 'E5',
      name: 'Tom Brown',
      skills: ['cashier', 'customer_service'],
      maxHours: 20,
      availabilityStart: new Date('2025-07-05T12:00:00'),
      availabilityEnd: new Date('2025-07-06T18:00:00')
    }),
    new Employee({
      id: 'E6',
      name: 'Ayman Samir',
      skills: ['cashier', 'customer_service'],
      maxHours: 20,
      availabilityStart: new Date('2025-07-05T12:00:00'),
      availabilityEnd: new Date('2025-07-06T18:00:00')
    }),
  ];

  private mockShiftsData : Shift[]= [
    new Shift({
      id: '1',
      title: 'Morning Shift',
      startTime: new Date('2025-07-07T08:00:00'),
      endTime: new Date('2025-07-07T16:00:00'),
      date: '2025-07-07',
      requiredSkills: ['cashier']
    }),
    new Shift({
      id: '2',
      title: 'Evening Shift',
      startTime: new Date('2025-07-07T16:00:00'),
      endTime: new Date('2025-07-08T00:00:00'), // Midnight next day
      date: '2025-07-07',
      requiredSkills: ['manager']
    }),
    new Shift({
      id: '3',
      title: 'Morning Shift',
      startTime: new Date('2025-07-08T08:00:00'),
      endTime: new Date('2025-07-08T16:00:00'),
      date: '2025-07-08',
      requiredSkills: ['inventory']
    }),
    new Shift({
      id: '4',
      title: 'Weekend Shift',
      startTime: new Date('2025-07-12T10:00:00'),
      endTime: new Date('2025-07-12T18:00:00'),
      date: '2025-07-12',
      requiredSkills: ['cashier']
    })
  ];

  constructor() {
    this.loadMockData();
  }

  loadMockData() {
    this.employees.set(this.mockEmployeesData);
    this.shifts.set(this.mockShiftsData);
  }

  importEmployeesFromCSV(csvData: string): void {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return; // Must have header + at least one data row
    
    const headerValues = this.parseCSVLine(lines[0]);
    const employees: Employee[] = [];
    
    // Create a mapping of column names to indices
    const columnMap = new Map<string, number>();
    headerValues.forEach((header, index) => {
      columnMap.set(header.trim().toLowerCase(), index);
    });
    
    // Validate required columns exist
    const requiredColumns = ['id', 'name', 'skills', 'max_hours', 'availability_start', 'availability_end'];
    const missingColumns = requiredColumns.filter(col => !columnMap.has(col));
    
    if (missingColumns.length > 0) {
      console.error('Missing required columns:', missingColumns);
      console.error('Available columns:', Array.from(columnMap.keys()));
      return;
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= headerValues.length) {
        try {
          const skillsValue = values[columnMap.get('skills')!]?.trim() || '';
          const skills = skillsValue
            .replace(/^"|"$/g, '') // Remove outer quotes
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          
          const employee = new Employee({
            id: values[columnMap.get('id')!]?.trim() || '',
            name: values[columnMap.get('name')!]?.trim() || '',
            skills: skills,
            maxHours: parseInt(values[columnMap.get('max_hours')!]?.trim() || '0'),
            availabilityStart: new Date(values[columnMap.get('availability_start')!]?.trim() || ''),
            availabilityEnd: new Date(values[columnMap.get('availability_end')!]?.trim() || '')
          });
          
          // Validate employee data
          if (employee.id && employee.name && !isNaN(employee.availabilityStart.getTime()) && !isNaN(employee.availabilityEnd.getTime())) {
            employees.push(employee);
          } else {
            console.warn(`Skipping invalid employee data at line ${i + 1}:`, employee);
          }
        } catch (error) {
          console.warn(`Error parsing employee data at line ${i + 1}:`, error);
        }
      }
    }
    
    this.employees.set(employees);
    console.log('Imported employees:', employees);
  }

  importShiftsFromCSV(csvData: string): void {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return; // Must have header + at least one data row
    
    const headerValues = this.parseCSVLine(lines[0]);
    const shifts: Shift[] = [];
    
    // Create a mapping of column names to indices
    const columnMap = new Map<string, number>();
    headerValues.forEach((header, index) => {
      columnMap.set(header.trim().toLowerCase(), index);
    });
    
    // Validate required columns exist
    const requiredColumns = ['id', 'role', 'start_time', 'end_time', 'required_skill'];
    const missingColumns = requiredColumns.filter(col => !columnMap.has(col));
    
    if (missingColumns.length > 0) {
      console.error('Missing required columns:', missingColumns);
      console.error('Available columns:', Array.from(columnMap.keys()));
      return;
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= headerValues.length) {
        try {
          const startDateTime = new Date(values[columnMap.get('start_time')!]?.trim() || '');
          const endDateTime = new Date(values[columnMap.get('end_time')!]?.trim() || '');
          
          // Validate dates
          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.warn(`Invalid date format at line ${i + 1}`);
            continue;
          }
          
          const shift = new Shift({
            id: values[columnMap.get('id')!]?.trim() || '',
            title: values[columnMap.get('role')!]?.trim() || '',
            startTime: startDateTime,
            endTime: endDateTime,
            date: startDateTime.toISOString().split('T')[0],         // Extract YYYY-MM-DD format
            requiredSkills: [values[columnMap.get('required_skill')!]?.trim() || '']
          });
          
          // Validate shift data
          if (shift.id && shift.title && shift.date && shift.requiredSkills[0]) {
            shifts.push(shift);
          } else {
            console.warn(`Skipping invalid shift data at line ${i + 1}:`, shift);
          }
        } catch (error) {
          console.warn(`Error parsing shift data at line ${i + 1}:`, error);
        }
      }
    }
    
    this.shifts.set(shifts);
    console.log('Imported shifts:', shifts);
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
  
  generateScheduleOffline(): void {
    console.log('Generating offline schedule...');
    
    const employees = this.employees();
    const shifts = this.shifts();
    const scheduleEntries: ScheduleEntry[] = [];
    
    // Reset all shift assignments
    shifts.forEach(shift => {
      shift.assignedEmployeeId = undefined;
    });

    
    // Sort shifts by date and start time to prioritize earlier shifts
    const sortedShifts = this.utilsService.sortShiftsByDateTime(shifts);
    
    // Track employee assignments and working hours
    const employeeAssignments = new Map<string, Shift[]>();
    const employeeWorkingHours = new Map<string, number>();
    
    // Initialize tracking maps
    employees.forEach(emp => {
      employeeAssignments.set(emp.id, []);
      employeeWorkingHours.set(emp.id, 0);
    });
    
    // Assign shifts using greedy algorithm with constraints
    for (const shift of sortedShifts) {
      const bestEmployee = this.findBestEmployeeForShift(shift, employees, employeeAssignments, employeeWorkingHours);
      
      if (bestEmployee) {
        // Assign the shift
        shift.assignedEmployeeId = bestEmployee.id;
        scheduleEntries.push({ shift: shift, employee: bestEmployee });
        
        // Update tracking
        employeeAssignments.get(bestEmployee.id)!.push(shift);
        const shiftDuration = shift.getDuration();
        employeeWorkingHours.set(bestEmployee.id, employeeWorkingHours.get(bestEmployee.id)! + shiftDuration);
        
        console.log(`Assigned shift ${shift.id} (${shift.title}) to ${bestEmployee.name}`);
      } else {
        // Shift remains unassigned
        scheduleEntries.push({ shift });
        console.warn(`Could not assign shift ${shift.id} (${shift.title}) - no suitable employee found`);
      }
    }
    
    // Update shifts with assignments
    const updatedShifts = scheduleEntries.map(entry => entry.shift);
    this.shifts.set(updatedShifts);
    this.schedule.set(scheduleEntries);
    
    console.log('Schedule generation completed');
    console.log('Assigned shifts:', scheduleEntries.filter(entry => entry.employee).length);
    console.log('Unassigned shifts:', scheduleEntries.filter(entry => !entry.employee).length);
  }
  
  private findBestEmployeeForShift(
    shift: Shift, 
    employees: Employee[], 
    employeeAssignments: Map<string, Shift[]>,
    employeeWorkingHours: Map<string, number>
  ): Employee | null {
    const eligibleEmployees = employees.filter(employee => {
      const currentAssignments = employeeAssignments.get(employee.id) || [];
      const currentHours = employeeWorkingHours.get(employee.id) || 0;
      return employee.canBeAssignedToShift(
        shift,
        currentAssignments);
    });
    
    if (eligibleEmployees.length === 0) return null;
    
    // Select the best employee based on priority criteria
    return this.selectBestEmployee(shift, eligibleEmployees, employeeWorkingHours);
  }
  
  private selectBestEmployee(
    shift: Shift, 
    eligibleEmployees: Employee[], 
    employeeWorkingHours: Map<string, number>
  ): Employee {
    // Priority criteria for selecting the best employee:
    // 1. Employee with the least current working hours (load balancing)
    // 2. Employee with the most matching skills (skill utilization)
    // 3. Tie-breaker: lexicographical order by name
    
    return eligibleEmployees.reduce((best, current) => {
      const bestHours = employeeWorkingHours.get(best.id) || 0;
      const currentHours = employeeWorkingHours.get(current.id) || 0;
      
      // Primary: Prefer employee with fewer working hours
      if (currentHours < bestHours) return current;
      if (bestHours < currentHours) return best;
      
      // Tie-breaker: lexicographical order
      return current.name < best.name ? current : best;
    });
  }
  
  getScheduleForWeek(weekStart: Date): ScheduleEntry[] {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return this.schedule().filter(entry => {
      const shiftDate = new Date(entry.shift.date);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
  }

  assignEmployeeToShift(shiftId: string, employeeId: string): void {
    const currentShifts = this.shifts();
    const updatedShifts = currentShifts.map(shift => {
      if (shift.id === shiftId) {
        shift.assignEmployee(employeeId);
      }
      return shift;
    });
    this.shifts.set(updatedShifts);
  }

  unassignEmployeeFromShift(shiftId: string): void {
    const currentShifts = this.shifts();
    const updatedShifts = currentShifts.map(shift => {
      if (shift.id === shiftId) {
        shift.unassignEmployee();
      }
      return shift;
    });
    this.shifts.set(updatedShifts);
  }
}
