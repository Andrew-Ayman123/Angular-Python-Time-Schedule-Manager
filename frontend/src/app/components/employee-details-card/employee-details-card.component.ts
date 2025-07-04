import { Component, Input, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Employee } from '../../models/employee.model';
import { ScheduleService } from '../../services/schedule.service';

@Component({
  selector: 'app-employee-details-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './employee-details-card.component.html',
  styleUrl: './employee-details-card.component.css'
})
export class EmployeeDetailsCardComponent {
  @Input() employee?: Employee;
  @Input() isUnassignedCard = false;
  @Input() unassignedShiftsCount = 0;

  private scheduleService = inject(ScheduleService);
  
  // Expose Math for template use
  Math = Math;

  getEmployeeInitials(name: string): string {
    return name.split(' ').map(part => part.charAt(0)).join('');
  }

  getEmployeeColor(employeeId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const hash = employeeId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  getEmployeeAssignedHours(employeeId: string): number {
    const shifts = this.scheduleService.shifts().filter(s => s.assignedEmployeeId === employeeId);
    return shifts.reduce((total, shift) => {
      const start = new Date(`1970-01-01T${shift.startTime}`);
      const end = new Date(`1970-01-01T${shift.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  }

  getEmployeeRemainingHours(employeeId: string): number {
    if (!this.employee) return 0;
    return Math.max(0, this.employee.maxHours - this.getEmployeeAssignedHours(employeeId));
  }

  getEmployeeOvertimeHours(employeeId: string): number {
    if (!this.employee) return 0;
    return Math.max(0, this.getEmployeeAssignedHours(employeeId) - this.employee.maxHours);
  }

  isEmployeeOvertime(employeeId: string): boolean {
    if (!this.employee) return false;
    return this.getEmployeeAssignedHours(employeeId) > this.employee.maxHours;
  }

  getProgressBarPercentage(employeeId: string): number {
    if (!this.employee) return 0;
    const assignedHours = this.getEmployeeAssignedHours(employeeId);
    
    // If overtime, show 100%
    if (assignedHours > this.employee.maxHours) {
      return 100;
    }
    
    // Otherwise, show actual percentage
    const percentage = Math.min(100, (assignedHours / this.employee.maxHours) * 100);
    return percentage;
  }

  getProgressBarColor(employeeId: string): string {
    if (!this.employee) return '#4caf50';
    
    const assignedHours = this.getEmployeeAssignedHours(employeeId);
    
    // If overtime, show red
    if (assignedHours > this.employee.maxHours) {
      return '#f44336';
    }
    
    // Otherwise, use green to yellow gradient based on percentage
    const percentage = (assignedHours / this.employee.maxHours) * 100;
    let color = '#4caf50';
    if (percentage < 80) {
      color = '#4caf50'; // Green
    } else if (percentage < 95) {
      color = '#ff9800'; // Orange
    } else {
      color = '#ff5722'; // Red-orange
    }
    return color;
  }
}
