import { Injectable } from '@angular/core';
import { Employee, Shift } from '../models/index';


@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  /**
   * Sorts shifts by date and time
   * @param shifts - Array of shifts to sort
   * @returns Sorted array of shifts
   */
  sortShiftsByDateTime(shifts: Shift[]): Shift[] {
    return [...shifts].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.getTime() - b.startTime.getTime();
    });
  }

  /**
   * Formats the shift date to a user-friendly format
   * @returns Formatted date string (e.g., "Mon, Jul 7")
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
