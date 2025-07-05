import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification, NotificationConfig, NotificationType } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private idCounter = 0;

  constructor() { }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  // Generic method to show any type of notification
  show(config: NotificationConfig): string {
    const id = this.generateId();
    const notification: Notification = {
      id,
      type: config.type,
      title: config.title ?? config.type,
      message: config.message,
      duration: config.duration ?? this.getDefaultDuration(config.type),
      timestamp: new Date(),
      isVisible: true
    };

    this.addNotification(notification);

    // Auto-dismiss if not persistent and has duration > 0
    if (!config.persistent && notification.duration! > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }

    return id;
  }

  // Convenience methods for different notification types
  success(message: string, title?: string, duration?: number): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(message: string, title?: string, persistent = false): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: persistent ? 0 : 8000,
      persistent
    });
  }

  warning(message: string, title?: string, duration?: number): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(message: string, title?: string, duration?: number): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  dismiss(id: string): void {
    const currentNotifications = this.notifications$.value;
    const notificationIndex = currentNotifications.findIndex(n => n.id === id);
    
    if (notificationIndex !== -1) {
      // Mark as not visible for animation
      currentNotifications[notificationIndex].isVisible = false;
      this.notifications$.next([...currentNotifications]);

      // Remove after animation completes
      setTimeout(() => {
        const updatedNotifications = this.notifications$.value.filter(n => n.id !== id);
        this.notifications$.next(updatedNotifications);
      }, 300); // Match the animation duration
    }
  }

  dismissAll(): void {
    const currentNotifications = this.notifications$.value;
    currentNotifications.forEach(notification => {
      notification.isVisible = false;
    });
    this.notifications$.next([...currentNotifications]);

    // Clear all after animation
    setTimeout(() => {
      this.notifications$.next([]);
    }, 300);
  }

  private addNotification(notification: Notification): void {
    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, notification]);
  }

  private generateId(): string {
    return `notification-${++this.idCounter}-${Date.now()}`;
  }

  private getDefaultDuration(type: NotificationType): number {
    switch (type) {
      case 'success':
        return 4000;
      case 'info':
        return 5000;
      case 'warning':
        return 6000;
      case 'error':
        return 8000;
      default:
        return 5000;
    }
  }
}
