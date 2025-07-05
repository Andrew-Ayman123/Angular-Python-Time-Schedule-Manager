import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { CalendarViewComponent } from '../calendar-view/calendar-view.component';
import { ScheduleService } from '../../services/schedule.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, ScheduleHeaderComponent, CalendarViewComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
}
