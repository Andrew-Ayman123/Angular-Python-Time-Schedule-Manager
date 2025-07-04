import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleService } from '../../services/schedule.service';
import { Employee, Shift } from '../../models/employee.model';

export interface SidebarAction {
  type: 'csv-import' | 'offline-schedule' | 'skill-match' | 'overtime' | 'ilp-schedule';
  label: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private scheduleService = inject(ScheduleService);
  
  isCollapsed = signal(false);
  // Use computed signals to stay reactive to service changes
  employees = this.scheduleService.employees;
  shifts = this.scheduleService.shifts;
  activeTab = signal<'employees' | 'shifts'>('employees');

  toggleSidebar(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  setActiveTab(tab: 'employees' | 'shifts'): void {
    this.activeTab.set(tab);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unassigned';
  }

  formatAvailabilityPeriod(startTimestamp: string, endTimestamp: string): string {
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}`;
  }
}
