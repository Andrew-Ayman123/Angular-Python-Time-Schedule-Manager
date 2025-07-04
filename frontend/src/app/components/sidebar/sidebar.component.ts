import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleService } from '../../services/schedule.service';
import { UtilsService } from '../../services/utils.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private scheduleService = inject(ScheduleService);
  private utilsService = inject(UtilsService);
  
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

  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unassigned';
  }

}
