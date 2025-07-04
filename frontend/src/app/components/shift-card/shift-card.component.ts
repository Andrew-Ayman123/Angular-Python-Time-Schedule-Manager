import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Employee, Shift } from '../../models/employee.model';
import { ScheduleService } from '../../services/schedule.service';

@Component({
  selector: 'app-shift-card',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './shift-card.component.html',
  styleUrl: './shift-card.component.css'
})
export class ShiftCardComponent {
  @Input() shift!: Shift;
  @Input() employee?: Employee;
  @Input() isUnassigned = false;
  @Input() employees: Employee[] = [];
  
  @Output() assignEmployee = new EventEmitter<{ shift: Shift, employee: Employee }>();
  @Output() unassignEmployee = new EventEmitter<Shift>();

  private scheduleService = inject(ScheduleService);

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  hasSkillMatch(employee: Employee, shift: Shift): boolean {
    return shift.requiredSkills.every(skill => employee.skills.includes(skill));
  }

  canAssignEmployee(employee: Employee, shift: Shift): boolean {
    // Check if employee already has a shift at the same time on the same date
    const conflictingShifts = this.scheduleService.shifts().filter(s => 
      s.assignedEmployeeId === employee.id && 
      s.date === shift.date &&
      s.id !== shift.id &&
      this.isTimeOverlapping(s, shift)
    );
    
    return conflictingShifts.length === 0;
  }

  private isTimeOverlapping(shift1: Shift, shift2: Shift): boolean {
    const start1 = new Date(`1970-01-01T${shift1.startTime}`);
    const end1 = new Date(`1970-01-01T${shift1.endTime}`);
    const start2 = new Date(`1970-01-01T${shift2.startTime}`);
    const end2 = new Date(`1970-01-01T${shift2.endTime}`);
    
    return start1 < end2 && start2 < end1;
  }

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

  onAssignEmployee(employee: Employee): void {
    this.assignEmployee.emit({ shift: this.shift, employee });
  }

  onUnassignEmployee(): void {
    this.unassignEmployee.emit(this.shift);
  }
}
