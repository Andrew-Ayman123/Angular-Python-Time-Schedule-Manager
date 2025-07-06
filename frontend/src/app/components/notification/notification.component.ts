import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ transform: 'translateX(100%)', opacity: 0 }),
          stagger('100ms', animate('300ms ease-in-out', style({ transform: 'translateX(0)', opacity: 1 })))
        ], { optional: true }),
        query(':leave', [
          stagger('50ms', animate('300ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 })))
        ], { optional: true })
      ])
    ]),
    trigger('shake', [
      state('inactive', style({ transform: 'translateX(0)' })),
      state('active', style({ transform: 'translateX(0)' })),
      transition('inactive => active', [
        animate('0.1s', style({ transform: 'translateX(-5px)' })),
        animate('0.1s', style({ transform: 'translateX(5px)' })),
        animate('0.1s', style({ transform: 'translateX(-5px)' })),
        animate('0.1s', style({ transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  }

  formatTime(timestamp: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  }

  trackByFn(index: number, item: Notification): string {
    return item.id;
  }
}
