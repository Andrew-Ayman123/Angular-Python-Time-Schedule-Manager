import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';

export interface ILPScheduleOptions {
  optimizeForCost: boolean;
  minimizeOvertime: boolean;
  prioritizeSkillMatch: boolean;
  balanceWorkload: boolean;
}

@Component({
  selector: 'app-schedule-header',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatSelectModule, 
    MatFormFieldModule, 
    MatCheckboxModule, 
    FormsModule
  ],
  templateUrl: './schedule-header.component.html',
  styleUrl: './schedule-header.component.css'
})
export class ScheduleHeaderComponent {
  private scheduleService = inject(ScheduleService);
  
  // Outputs for parent component communication
  importEmployees = output<void>();
  importShifts = output<void>();
  generateOfflineSchedule = output<void>();
  generateILPSchedule = output<ILPScheduleOptions>();

  // Multi-selection options for ILP
  ilpOptions = signal<ILPScheduleOptions>({
    optimizeForCost: true,
    minimizeOvertime: true,
    prioritizeSkillMatch: true,
    balanceWorkload: false
  });

  // File upload states
  employeesFile = signal<File | null>(null);
  shiftsFile = signal<File | null>(null);

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
        this.importEmployees.emit();
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
        this.importShifts.emit();
        // Reset file after import
        this.shiftsFile.set(null);
      };
      
      reader.onerror = (e) => {
        console.error('Error reading shifts file:', e);
      };
      
      reader.readAsText(file);
    }
  }

  onGenerateOfflineSchedule(): void {
    this.generateOfflineSchedule.emit();
  }

  onGenerateILPSchedule(): void {
    this.generateILPSchedule.emit(this.ilpOptions());
  }

  updateILPOption(option: keyof ILPScheduleOptions, value: boolean): void {
    this.ilpOptions.update(current => ({
      ...current,
      [option]: value
    }));
  }
}
