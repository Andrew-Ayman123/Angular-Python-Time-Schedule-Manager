import { Component, signal, computed, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ScheduleService } from '../../services/schedule.service';
import { UtilsService } from '../../services/utils.service';
import { Employee, Shift } from '../../models/index';
import { EmployeeDetailsCardComponent } from '../employee-details-card/employee-details-card.component';
import { ShiftCardComponent } from '../shift-card/shift-card.component';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatSelectModule,
    MatFormFieldModule,
    EmployeeDetailsCardComponent,
    ShiftCardComponent
  ],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css'
})
export class CalendarViewComponent {
  private scheduleService = inject(ScheduleService);
  private utilsService = inject(UtilsService);
  
  // Get data from schedule service instead of parent inputs
  employees = computed(() => this.scheduleService.employees());
  shifts = computed(() => this.scheduleService.shifts());

  currentDate = signal(new Date());
  selectedView = signal<'week' | 'month'>('week');

  constructor() {
    // Initialize schedule service with mock data if needed
    if (this.scheduleService.employees().length === 0) {
      this.scheduleService.loadMockData();
    }
  }

  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  currentWeek = computed(() => {
    const current = this.currentDate();
    const startOfWeek = new Date(current);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  });

  currentMonth = computed(() => {
    const current = this.currentDate();
    const year = current.getFullYear();
    const month = current.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);

    // Start from Monday of the first week
    const startDay = firstDay.getDay();
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(firstDay.getDate() + mondayOffset);

    // End at Sunday of the last week
    const endDay = lastDay.getDay();
    const sundayOffset = endDay === 0 ? 0 : 7 - endDay;
    endDate.setDate(lastDay.getDate() + sundayOffset);

    const weeks = [];
    let currentWeek = [];
    const currentDateIter = new Date(startDate);

    while (currentDateIter <= endDate) {
      currentWeek.push(new Date(currentDateIter));
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }

    return weeks;
  });

  getShiftsForDate(date: Date): Shift[] {
    const dateString = date.toISOString().split('T')[0];
    return this.shifts().filter(shift => shift.date === dateString);
  }

  getShiftsForEmployeeAndDate(employeeId: string, date: Date): Shift[] {
    const dateString = date.toISOString().split('T')[0];
    return this.shifts().filter(shift => 
      shift.date === dateString && 
      (shift.assignedEmployeeId === employeeId || !shift.assignedEmployeeId)
    );
  }

  getAssignedShiftsForEmployeeAndDate(employeeId: string, date: Date): Shift[] {
    const dateString = date.toISOString().split('T')[0];
    return this.shifts().filter(shift => 
      shift.date === dateString && 
      shift.assignedEmployeeId === employeeId
    );
  }

  getUnassignedShiftsForDate(date: Date): Shift[] {
    const dateString = date.toISOString().split('T')[0];
    return this.shifts().filter(shift => 
      shift.date === dateString && !shift.assignedEmployeeId
    );
  }

  getUnassignedShiftsCount(): number {
    return this.shifts().filter(shift => !shift.assignedEmployeeId).length;
  }

  getEmployeeById(employeeId: string): Employee | undefined {
    return this.employees().find(emp => emp.id === employeeId);
  }

  previousPeriod(): void {
    const current = this.currentDate();
    if (this.selectedView() === 'week') {
      current.setDate(current.getDate() - 7);
    } else {
      current.setMonth(current.getMonth() - 1);
    }
    this.currentDate.set(new Date(current));
  }

  nextPeriod(): void {
    const current = this.currentDate();
    if (this.selectedView() === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
    this.currentDate.set(new Date(current));
  }

  goToToday(): void {
    this.currentDate.set(new Date());
  }

  switchView(view: 'week' | 'month'): void {
    this.selectedView.set(view);
  }

  formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }
  formatDate(date: Date): string {
    return this.utilsService.formatDate(date);
  }

  isCurrentMonth(date: Date): boolean {
    const current = this.currentDate();
    return date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  assignEmployee(shift: Shift, employee: Employee): void {
    // Update the shift assignment in the schedule service
    this.scheduleService.assignEmployeeToShift(shift.id, employee.id);
    console.log('Assign employee', employee.name, 'to shift', shift.title);
  }

  unassignEmployee(shift: Shift): void {
    // Remove the employee assignment from the schedule service
    this.scheduleService.unassignEmployeeFromShift(shift.id);
    console.log('Unassign employee from shift', shift.title);
  }

  getEmployeeRemainingHours(employeeId: string): number {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return 0;

    const assignedShifts = this.shifts().filter(shift => shift.assignedEmployeeId === employeeId);
    const totalAssignedHours = assignedShifts.reduce((total, shift) => {
      const shiftHours = shift.getDuration();
      return total + shiftHours;
    }, 0);

    return Math.max(0, employee.maxHours - totalAssignedHours);
  }

  getEmployeeAssignedHours(employeeId: string): number {
    const assignedShifts = this.shifts().filter(shift => shift.assignedEmployeeId === employeeId);
    return assignedShifts.reduce((total, shift) => {
      const shiftHours = shift.getDuration();
      return total + shiftHours;
    }, 0);
  }

  getEmployeeOvertimeHours(employeeId: string): number {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return 0;

    const assignedHours = this.getEmployeeAssignedHours(employeeId);
    return Math.max(0, assignedHours - employee.maxHours);
  }

  isEmployeeOvertime(employeeId: string): boolean {
    return this.getEmployeeOvertimeHours(employeeId) > 0;
  }

  // Event handlers for the new components
  onAssignEmployee(event: { shift: Shift, employee: Employee }): void {
    this.scheduleService.assignEmployeeToShift(event.shift.id, event.employee.id);
    console.log('Assigned employee', event.employee.name, 'to shift', event.shift.title);
  }

  onUnassignEmployee(shift: Shift): void {
    this.scheduleService.unassignEmployeeFromShift(shift.id);
    console.log('Unassigned employee from shift', shift.title);
  }

  hasUnassignedShifts(): boolean {
    return this.shifts().some(shift => !shift.assignedEmployeeId);
  }
}
