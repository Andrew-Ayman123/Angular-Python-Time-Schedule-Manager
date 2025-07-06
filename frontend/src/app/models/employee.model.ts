import { Shift } from './shift.model';
import { EmployeeAPI } from './api-schema.model';

export class Employee {
  id: string;
  name: string;
  skills: string[];
  maxHours: number;
  availabilityStart: Date;
  availabilityEnd: Date;

  constructor(data: {
    id: string;
    name: string;
    skills: string[];
    maxHours: number;
    availabilityStart: Date;
    availabilityEnd: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.skills = data.skills;
    this.maxHours = data.maxHours;
    this.availabilityStart = data.availabilityStart;
    this.availabilityEnd = data.availabilityEnd;
  }

  /**
   * Gets employee initials from full name
   * @returns Initials string (e.g., "JD" for "John Doe")
   */
  getInitials(): string {
    return this.name.split(' ').map(part => part.charAt(0)).join('');
  }

  /**
   * Generates a consistent color for the employee based on their ID
   * @returns Hex color string
   */
  getColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const hash = this.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Checks if the employee has the required skills for a shift
   * @param shift - The shift requiring skills
   * @returns True if employee has at least one required skill, false otherwise
   */
  hasRequiredSkills(shift: Shift): boolean {
    return shift.requiredSkills.some((requiredSkill: string) => 
      this.skills.includes(requiredSkill)
    );
  }

  /**
   * Checks if a shift fits within the employee's availability window
   * @param shift - The shift to check
   * @returns True if shift is within availability, false otherwise
   */
  isShiftWithinAvailability(shift: Shift): boolean {

    return shift.startTime >= this.availabilityStart && shift.endTime <= this.availabilityEnd;
  }

  /**
   * Checks if the employee can be assigned to a shift based on all constraints
   * @param shift - The shift to assign
   * @param existingAssignments - Existing shifts assigned to the employee
   * @param currentWorkingHours - Current working hours for the employee
   * @returns True if employee can be assigned, false otherwise
   */
  canBeAssignedToShift(
    shift: Shift, 
    existingAssignments: Shift[] = []
  ): boolean {
    // 1. Skill Matching: Employee must have required skill for shift
    if (!this.hasRequiredSkills(shift)) {
      return false;
    }
    
    // 2. Availability Windows: Shifts must fit within employee availability
    if (!this.isShiftWithinAvailability(shift)) {
      return false;
    }
    
    // 3. No Overlapping: One employee cannot work overlapping shifts
    if (shift.overlapsWithAny(existingAssignments)) {
      return false;
    }
    
    // 4. Max Hours: Check if employee hasn't exceeded max hours (Leave this for ILP scheduling)
    // const shiftDuration = shift.getDuration();
    // if (currentWorkingHours + shiftDuration > this.maxHours) {
    //   return false;
    // }
    
    return true;
  }

  /**
   * Formats the employee's availability period
   * @returns Formatted availability period string
   */
  formatAvailabilityPeriod(): string {
    const formatDateOnly = (date: Date) => date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const formatTimeOnly = (date: Date) => date.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${formatDateOnly(this.availabilityStart)} ${formatTimeOnly(this.availabilityStart)} - ${formatDateOnly(this.availabilityEnd)} ${formatTimeOnly(this.availabilityEnd)}`;
  }

  /**
   * Converts this Employee instance to EmployeeAPI format
   * @returns EmployeeAPI object suitable for API requests/responses
   */
  toEmployeeAPI(): EmployeeAPI {
    return {
      id: this.id,
      name: this.name,
      skills: this.skills,
      max_hours: this.maxHours,
      availability: {
        start: this.availabilityStart.toISOString(),
        end: this.availabilityEnd.toISOString()
      }
    };
  }
}
