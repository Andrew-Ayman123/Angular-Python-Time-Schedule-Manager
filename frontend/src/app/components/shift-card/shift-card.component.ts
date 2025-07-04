import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Employee, Shift } from '../../models/index';
import { ScheduleService } from '../../services/schedule.service';
import { UtilsService } from '../../services/utils.service';

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

  onAssignEmployee(employee: Employee): void {
    this.assignEmployee.emit({ shift: this.shift, employee });
  }

  onUnassignEmployee(): void {
    this.unassignEmployee.emit(this.shift);
  }
}
