import { Injectable, signal } from '@angular/core';
import { Employee, Shift, ScheduleEntry } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  employees = signal<Employee[]>([]);
  shifts = signal<Shift[]>([]);
  schedule = signal<ScheduleEntry[]>([]);
  
  // Mock data for demonstration
  private mockEmployees: Employee[] = [
    {
      id: 'E1',
      name: 'John Doe',
      skills: ['cook', 'cashier'],
      maxHours: 80,
      availabilityStart: '2025-07-01T08:00:00',
      availabilityEnd: '2025-07-14T22:00:00'
    },
    {
      id: 'E2',
      name: 'Jane Smith',
      skills: ['cook'],
      maxHours: 40,
      availabilityStart: '2025-07-01T06:00:00',
      availabilityEnd: '2025-07-14T18:00:00'
    },
    {
      id: 'E3',
      name: 'Mike Johnson',
      skills: ['inventory', 'maintenance'],
      maxHours: 30,
      availabilityStart: '2025-07-03T10:00:00',
      availabilityEnd: '2025-07-13T20:00:00'
    },
    {
      id: 'E4',
      name: 'Sarah Wilson',
      skills: ['cashier', 'customer_service'],
      maxHours: 10,
      availabilityStart: '2025-07-05T12:00:00',
      availabilityEnd: '2025-07-06T18:00:00'
    },
    {
      id: 'E5',
      name: 'Tom Brown',
      skills: ['cashier', 'customer_service'],
      maxHours: 20,
      availabilityStart: '2025-07-05T12:00:00',
      availabilityEnd: '2025-07-06T18:00:00'
    },
    {
      id: 'E6',
      name: 'Ayman Samir',
      skills: ['cashier', 'customer_service'],
      maxHours: 20,
      availabilityStart: '2025-07-05T12:00:00',
      availabilityEnd: '2025-07-06T18:00:00'
    },
  ];

  private mockShifts: Shift[] = [
    {
      id: '1',
      title: 'Morning Shift',
      startTime: '08:00',
      endTime: '16:00',
      date: '2025-07-07',
      requiredSkills: ['cashier']
    },
    {
      id: '2',
      title: 'Evening Shift',
      startTime: '16:00',
      endTime: '24:00',
      date: '2025-07-07',
      requiredSkills: ['manager']
    },
    {
      id: '3',
      title: 'Morning Shift',
      startTime: '08:00',
      endTime: '16:00',
      date: '2025-07-08',
      requiredSkills: ['inventory']
    },
    {
      id: '4',
      title: 'Weekend Shift',
      startTime: '10:00',
      endTime: '18:00',
      date: '2025-07-12',
      requiredSkills: ['cashier']
    }
  ];

  constructor() {
    this.loadMockData();
  }

  loadMockData() {
    this.employees.set(this.mockEmployees);
    this.shifts.set(this.mockShifts);
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
          
          const employee: Employee = {
            id: values[columnMap.get('id')!]?.trim() || '',
            name: values[columnMap.get('name')!]?.trim() || '',
            skills: skills,
            maxHours: parseInt(values[columnMap.get('max_hours')!]?.trim() || '0'),
            availabilityStart: values[columnMap.get('availability_start')!]?.trim() || '',
            availabilityEnd: values[columnMap.get('availability_end')!]?.trim() || ''
          };
          
          // Validate employee data
          if (employee.id && employee.name && employee.availabilityStart && employee.availabilityEnd) {
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
    // Regenerate schedule with new data
    this.generateSchedule();
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
          
          const shift: Shift = {
            id: values[columnMap.get('id')!]?.trim() || '',
            title: values[columnMap.get('role')!]?.trim() || '',
            startTime: startDateTime.toTimeString().substring(0, 5), // Extract HH:MM format
            endTime: endDateTime.toTimeString().substring(0, 5),     // Extract HH:MM format
            date: startDateTime.toISOString().split('T')[0],         // Extract YYYY-MM-DD format
            requiredSkills: [values[columnMap.get('required_skill')!]?.trim() || '']
          };
          
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
    // Regenerate schedule with new data
    this.generateSchedule();
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

  private isEmployeeAvailableOnDay(employee: Employee, dayOfWeek: string): boolean {
    // For now, we'll check if the current date falls within the availability period
    // This is a simplified version - in a real app you'd want more sophisticated time checking
    const now = new Date();
    const availabilityStart = new Date(employee.availabilityStart);
    const availabilityEnd = new Date(employee.availabilityEnd);
    
    return now >= availabilityStart && now <= availabilityEnd;
  }

  private isEmployeeAvailableForShift(employee: Employee, shift: Shift): boolean {
    const shiftDate = new Date(shift.date);
    const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
    const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
    
    const availabilityStart = new Date(employee.availabilityStart);
    const availabilityEnd = new Date(employee.availabilityEnd);
    
    // Check if shift date is within availability period
    if (shiftDate < availabilityStart || shiftDate > availabilityEnd) {
      return false;
    }
    
    // Check if shift time overlaps with availability time on the same day
    const availabilityStartTime = new Date(availabilityStart);
    const availabilityEndTime = new Date(availabilityEnd);
    
    // For simplicity, if the shift date is within the availability period, 
    // we'll check if the shift time is within the daily availability hours
    const availabilityDayStart = new Date(`${shift.date}T${availabilityStart.toTimeString().split(' ')[0]}`);
    const availabilityDayEnd = new Date(`${shift.date}T${availabilityEnd.toTimeString().split(' ')[0]}`);
    
    return shiftStart >= availabilityDayStart && shiftEnd <= availabilityDayEnd;
  }

  generateSchedule(): void {
    // Offline greedy solver - first-fit scheduling algorithm
    const scheduledEntries: ScheduleEntry[] = [];
    const employeeHours: { [key: string]: number } = {};
    
    // Initialize employee hours
    this.employees().forEach(emp => {
      employeeHours[emp.id] = 0;
    });

    this.shifts().forEach(shift => {
      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
      const shiftHours = this.calculateShiftHours(shift.startTime, shift.endTime);

      // Find suitable employee
      const suitableEmployee = this.employees().find(emp => 
        this.isEmployeeAvailableForShift(emp, shift) &&
        emp.skills.some(skill => shift.requiredSkills.includes(skill)) &&
        (employeeHours[emp.id] + shiftHours) <= emp.maxHours
      );

      if (suitableEmployee) {
        employeeHours[suitableEmployee.id] += shiftHours;
        scheduledEntries.push({
          shift: { ...shift, assignedEmployeeId: suitableEmployee.id },
          employee: suitableEmployee
        });
      } else {
        // Add unassigned shift
        scheduledEntries.push({
          shift: shift
        });
      }
    });

    this.schedule.set(scheduledEntries);
  }

  private calculateShiftHours(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
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
    const updatedShifts = currentShifts.map(shift => 
      shift.id === shiftId ? { ...shift, assignedEmployeeId: employeeId } : shift
    );
    this.shifts.set(updatedShifts);
    
    // Update the schedule as well
    this.generateSchedule();
  }

  unassignEmployeeFromShift(shiftId: string): void {
    const currentShifts = this.shifts();
    const updatedShifts = currentShifts.map(shift => 
      shift.id === shiftId ? { ...shift, assignedEmployeeId: undefined } : shift
    );
    this.shifts.set(updatedShifts);
    
    // Update the schedule as well
    this.generateSchedule();
  }
}
