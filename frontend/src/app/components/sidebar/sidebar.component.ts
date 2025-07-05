import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ScheduleService } from '../../services/schedule.service';
import { UtilsService } from '../../services/utils.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
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
  activeTab = signal<'employees' | 'shifts' | 'data'>('data');

  // File upload states
  employeesFile = signal<File | null>(null);
  shiftsFile = signal<File | null>(null);

  toggleSidebar(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  setActiveTab(tab: 'employees' | 'shifts' | 'data'): void {
    this.activeTab.set(tab);
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unassigned';
  }

  // Data handling methods moved from schedule header
  onEmployeesFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.employeesFile.set(file);
    }
  }

  onShiftsFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.shiftsFile.set(file);
    }
  }

  onImportEmployees(): void {
    if (this.employeesFile()) {
      const file = this.employeesFile()!;
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        this.scheduleService.importEmployeesFromCSV(csvData);
        
        // Reset file after import
        this.employeesFile.set(null);
      };
      
      reader.onerror = (e) => {
        console.error('Error reading employees file:', e);
      };
      
      reader.readAsText(file);
    }
  }

  onImportShifts(): void {
    if (this.shiftsFile()) {
      const file = this.shiftsFile()!;
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        this.scheduleService.importShiftsFromCSV(csvData);
        // Reset file after import
        this.shiftsFile.set(null);
      };
      
      reader.onerror = (e) => {
        console.error('Error reading shifts file:', e);
      };
      
      reader.readAsText(file);
    }
  }

  onExportSchedule(): void {
    this.scheduleService.exportSchedule();
  }
}
