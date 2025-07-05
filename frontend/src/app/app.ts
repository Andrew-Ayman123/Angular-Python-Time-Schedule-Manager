import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent} from './components/sidebar/sidebar.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [
    // RouterOutlet, 
    CommonModule, 
    SidebarComponent, 
    CalendarComponent,
    NotificationComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'Schedule Manager';
}
