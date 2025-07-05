import { Injectable, signal, inject } from '@angular/core';
import { Employee, Shift, ScheduleEntry } from '../models/index';
import { UtilsService } from './utils.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private utilsService = inject(UtilsService);
  private notificationService = inject(NotificationService);

  employees = signal<Employee[]>([]);
  shifts = signal<Shift[]>([]);
  schedule = signal<ScheduleEntry[]>([]);

  // Mock data for demonstration
  private mockEmployeesData: Employee[] = [
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

  private mockShiftsData: Shift[] = [
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
    try {
      // Validate CSV data format first
      const requiredColumns = ['id', 'name', 'skills', 'max_hours', 'availability_start', 'availability_end'];
      const validation = this.validateCSVData(csvData, requiredColumns);

      if (!validation.isValid) {
        this.notificationService.error(validation.error!, 'CSV Import Error');
        return;
      }

      const lines = csvData.trim().split('\n');
      const headerValues = this.parseCSVLine(lines[0]);
      const employees: Employee[] = [];

      // Create a mapping of column names to indices
      const columnMap = new Map<string, number>();
      headerValues.forEach((header, index) => {
        columnMap.set(header.trim().toLowerCase(), index);
      });

      let validEmployees = 0;
      let skippedEmployees = 0;

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
              validEmployees++;
            } else {
              console.warn(`Skipping invalid employee data at line ${i + 1}:`, employee);
              skippedEmployees++;
            }
          } catch (error) {
            console.warn(`Error parsing employee data at line ${i + 1}:`, error);
            skippedEmployees++;
          }
        } else {
          skippedEmployees++;
        }
      }

      if (employees.length === 0) {
        this.notificationService.error('No valid employee data found in CSV file', 'Import Failed');
        return;
      }

      this.employees.set(employees);

      // Show success notification with summary
      if (skippedEmployees > 0) {
        this.notificationService.warning(
          `Successfully imported ${validEmployees} employees. ${skippedEmployees} rows were skipped due to invalid data.`,
          'Import Completed with Warnings'
        );
      } else {
        this.notificationService.success(
          `Successfully imported ${validEmployees} employees.`,
          'Import Successful'
        );
      }

      console.log('Imported employees:', employees);
    } catch (error) {
      console.error('Error importing employees from CSV:', error);
      this.notificationService.error(
        'An unexpected error occurred while importing employees. Please check the CSV format and try again.',
        'Import Error'
      );
    }
  }

  importShiftsFromCSV(csvData: string): void {
    try {
      // Validate CSV data format first
      const requiredColumns = ['id', 'role', 'start_time', 'end_time', 'required_skill'];
      const validation = this.validateCSVData(csvData, requiredColumns);

      if (!validation.isValid) {
        this.notificationService.error(validation.error!, 'CSV Import Error');
        return;
      }

      const lines = csvData.trim().split('\n');
      const headerValues = this.parseCSVLine(lines[0]);
      const shifts: Shift[] = [];

      // Create a mapping of column names to indices
      const columnMap = new Map<string, number>();
      headerValues.forEach((header, index) => {
        columnMap.set(header.trim().toLowerCase(), index);
      });

      let validShifts = 0;
      let skippedShifts = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length >= headerValues.length) {
          try {
            const startDateTime = new Date(values[columnMap.get('start_time')!]?.trim() || '');
            const endDateTime = new Date(values[columnMap.get('end_time')!]?.trim() || '');

            // Validate dates
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
              console.warn(`Invalid date format at line ${i + 1}`);
              skippedShifts++;
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
              validShifts++;
            } else {
              console.warn(`Skipping invalid shift data at line ${i + 1}:`, shift);
              skippedShifts++;
            }
          } catch (error) {
            console.warn(`Error parsing shift data at line ${i + 1}:`, error);
            skippedShifts++;
          }
        } else {
          skippedShifts++;
        }
      }

      if (shifts.length === 0) {
        this.notificationService.error('No valid shift data found in CSV file', 'Import Failed');
        return;
      }

      this.shifts.set(shifts);

      // Show success notification with summary
      if (skippedShifts > 0) {
        this.notificationService.warning(
          `Successfully imported ${validShifts} shifts. ${skippedShifts} rows were skipped due to invalid data.`,
          'Import Completed with Warnings'
        );
      } else {
        this.notificationService.success(
          `Successfully imported ${validShifts} shifts.`,
          'Import Successful'
        );
      }

      console.log('Imported shifts:', shifts);
    } catch (error) {
      console.error('Error importing shifts from CSV:', error);
      this.notificationService.error(
        'An unexpected error occurred while importing shifts. Please check the CSV format and try again.',
        'Import Error'
      );
    }
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

  // Helper method to validate CSV data format
  private validateCSVData(csvData: string, requiredColumns: string[]): { isValid: boolean; error?: string } {
    if (!csvData || csvData.trim().length === 0) {
      return { isValid: false, error: 'CSV data is empty' };
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return { isValid: false, error: 'CSV file must contain a header row and at least one data row' };
    }

    const headerValues = this.parseCSVLine(lines[0]);
    const columnMap = new Map<string, number>();
    headerValues.forEach((header, index) => {
      columnMap.set(header.trim().toLowerCase(), index);
    });

    const missingColumns = requiredColumns.filter(col => !columnMap.has(col));
    if (missingColumns.length > 0) {
      return {
        isValid: false,
        error: `Missing required columns: ${missingColumns.join(', ')}. Available columns: ${Array.from(columnMap.keys()).join(', ')}`
      };
    }

    return { isValid: true };
  }

  generateScheduleOffline(): void {
    try {
      console.log('Generating offline schedule...');

      const employees = this.employees();
      const shifts = this.shifts();

      // Validate that we have employees and shifts
      if (employees.length === 0) {
        this.notificationService.error('No employees available for scheduling. Please import employees first.', 'Scheduling Failed');
        return;
      }

      if (shifts.length === 0) {
        this.notificationService.error('No shifts available for scheduling. Please import shifts first.', 'Scheduling Failed');
        return;
      }

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

      let assignedShifts = 0;
      let unassignedShifts = 0;

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
          assignedShifts++;
        } else {
          // Shift remains unassigned
          scheduleEntries.push({ shift });
          console.warn(`Could not assign shift ${shift.id} (${shift.title}) - no suitable employee found`);
          unassignedShifts++;
        }
      }

      // Update shifts with assignments
      const updatedShifts = scheduleEntries.map(entry => entry.shift);
      this.shifts.set(updatedShifts);
      this.schedule.set(scheduleEntries);

      console.log('Schedule generation completed');
      console.log('Assigned shifts:', assignedShifts);
      console.log('Unassigned shifts:', unassignedShifts);

      // Show appropriate notification based on results
      if (unassignedShifts === 0) {
        this.notificationService.success(
          `Successfully generated schedule! All ${assignedShifts} shifts have been assigned.`,
          'Schedule Generated'
        );
      } else if (assignedShifts > 0) {
        this.notificationService.warning(
          `Schedule generated with ${assignedShifts} assigned and ${unassignedShifts} unassigned shifts. Check employee availability and skills.`,
          'Schedule Generated with Issues'
        );
      } else {
        this.notificationService.error(
          `Failed to assign any shifts. Please check employee availability, skills, and shift requirements.`,
          'Schedule Generation Failed'
        );
      }

    } catch (error) {
      console.error('Error generating schedule:', error);
      this.notificationService.error(
        'An unexpected error occurred while generating the schedule. Please try again.',
        'Schedule Generation Error'
      );
    }
  }

  private findBestEmployeeForShift(
    shift: Shift,
    employees: Employee[],
    employeeAssignments: Map<string, Shift[]>,
    employeeWorkingHours: Map<string, number>
  ): Employee | null {
    const eligibleEmployees = employees.filter(employee => {
      const currentAssignments = employeeAssignments.get(employee.id) || [];
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
    // 1. Employee with the least current working hours
    // 2. Tie-breaker: lexicographical order by name

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

  exportSchedule(): void {
    try {
      const shifts = this.shifts();
      const employees = this.employees();

      if (shifts.length === 0) {
        this.notificationService.warning('No shifts available to export.', 'Export Warning');
        return;
      }

      // Create CSV header
      const headers = [
        'id',
        'role',
        'start_time',
        'end_time',
        'required_skill',
        'employee_id',
        'employee_name',
        'employee_skills',
        'employee_max_hours',
        'employee_availability_start',
        'employee_availability_end'
      ];

      // Convert shifts data to CSV rows
      const csvRows = shifts.map(shift => {
        // Find the assigned employee if any
        const assignedEmployee = shift.assignedEmployeeId
          ? employees.find(emp => emp.id === shift.assignedEmployeeId)
          : null;

        return [
          shift.id,
          shift.title,
          shift.startTime.toISOString(),
          shift.endTime.toISOString(),
          shift.requiredSkills.join(';'), // Join multiple skills with semicolon
          assignedEmployee?.id || 'N/A',
          assignedEmployee?.name || 'N/A',
          assignedEmployee?.skills.join(';') || 'N/A',
          assignedEmployee?.maxHours?.toString() || 'N/A',
          assignedEmployee ? assignedEmployee.availabilityStart.toISOString() : 'N/A',
          assignedEmployee ? assignedEmployee.availabilityEnd.toISOString() : 'N/A'
        ];
      });

      // Combine headers and data
      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `schedule_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);

      this.notificationService.success(
        `Schedule exported successfully with ${shifts.length} shifts.`,
        'Export Complete'
      );

    } catch (error) {
      console.error('Error exporting schedule:', error);
      this.notificationService.error(
        'An unexpected error occurred while exporting the schedule. Please try again.',
        'Export Error'
      );
    }
  }
}
