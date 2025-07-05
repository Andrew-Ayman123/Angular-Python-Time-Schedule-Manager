export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: Date;
  isVisible?: boolean;
}

export interface NotificationConfig {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 means no auto-dismiss
  persistent?: boolean; // if true, won't auto-dismiss
}
