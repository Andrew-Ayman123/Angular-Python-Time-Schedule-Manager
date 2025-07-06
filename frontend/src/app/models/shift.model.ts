import { ShiftAPI } from './api-schema.model';

export class Shift {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  date: string; // Keep as string for date-only representation (YYYY-MM-DD)
  requiredSkills: string[];
  assignedEmployeeId?: string;

  constructor(data: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    date: string;
    requiredSkills: string[];
    assignedEmployeeId?: string;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.date = data.date;
    this.requiredSkills = data.requiredSkills;
    this.assignedEmployeeId = data.assignedEmployeeId;
  }

  /**
   * Calculates the duration of the shift in hours
   * @returns Duration in hours
   */
  getDuration(): number {
    // Calculate duration in milliseconds and convert to hours
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    return durationMs / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Formats the start time to a user-friendly string
   * @returns Formatted time string (e.g., "8:00 AM")
   */
  formatStartTime(): string {
    return this.startTime.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Formats the end time to a user-friendly string
   * @returns Formatted time string (e.g., "4:00 PM")
   */
  formatEndTime(): string {
    return this.endTime.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Formats the shift time range
   * @returns Formatted time range string (e.g., "8:00 AM - 4:00 PM")
   */
  formatTimeRange(): string {
    return `${this.formatStartTime()} - ${this.formatEndTime()}`;
  }

  /**
   * Formats the shift date to a user-friendly format
   * @returns Formatted date string (e.g., "Mon, Jul 7")
   */
  formatDate(): string {
    const date = new Date(this.date);
    
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Checks if this shift overlaps with another shift
   * @param otherShift - The other shift to compare
   * @returns True if shifts overlap, false otherwise
   */
  overlapsWith(otherShift: Shift): boolean {

    // Check for overlap: shifts overlap if one starts before the other ends
    return ! (this.endTime < otherShift.startTime || this.startTime>otherShift.endTime);
  }

  overlapsWithAny(otherShifts: Shift[]): boolean {
    // Check if this shift overlaps with any of the provided shifts
    return otherShifts.some(otherShift => this.overlapsWith(otherShift));
  }

  /**
   * Checks if the shift is assigned to an employee
   * @returns True if assigned, false otherwise
   */
  isAssigned(): boolean {
    return !!this.assignedEmployeeId;
  }

  /**
   * Assigns an employee to this shift
   * @param employeeId - The employee ID to assign
   */
  assignEmployee(employeeId: string): void {
    this.assignedEmployeeId = employeeId;
  }

  /**
   * Unassigns the employee from this shift
   */
  unassignEmployee(): void {
    this.assignedEmployeeId = undefined;
  }

  /**
   * Converts this Shift instance to ShiftAPI format
   * @returns ShiftAPI object suitable for API requests/responses
   */
  toShiftAPI(): ShiftAPI {
    return {
      id: this.id,
      role: this.title,
      start_time: this.startTime.toISOString(),
      end_time: this.endTime.toISOString(),
      required_skill: this.requiredSkills[0] || '' // Take first skill or empty string
    };
  }

}
