import { Component, signal, output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';
import { NotificationService } from '../../services/notification.service';
import { BackendService } from '../../services/backend.service';
import { OptimizeRequest, OptimizeResponse, ConstraintType } from '../../models';

export interface ILPConstraints {
  skillMatching: boolean;
  overtimeLimits: boolean;
  availabilityWindows: boolean;
  noOverlapping: boolean;
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
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    FormsModule
  ],
  templateUrl: './schedule-header.component.html',
  styleUrl: './schedule-header.component.css'
})
export class ScheduleHeaderComponent implements OnInit, OnDestroy {
  private scheduleService = inject(ScheduleService);
  private backendService = inject(BackendService);
  private notificationService = inject(NotificationService);
  
  // Health check interval
  private healthCheckInterval: any;
  private readonly HEALTH_CHECK_INTERVAL = 5000; // 5 seconds

  // ILP constraints
  ilpConstraints = signal<ILPConstraints>({
    skillMatching: true,
    overtimeLimits: true,
    availabilityWindows: true,
    noOverlapping: true
  });

  // Backend state
  get isBackendHealthy() { return this.backendService.isBackendHealthy; }
  get isOptimizing() { return this.backendService.isOptimizing; }
  get lastOptimizationResult() { return this.backendService.lastOptimizationResult; }

  onGenerateOfflineSchedule(): void {
    this.scheduleService.generateScheduleOffline();
  }

  onGenerateILPSchedule(): void {
    // Reset previous results
    this.backendService.resetOptimizationState();
    
    // Check if backend is healthy before proceeding
    if (this.isBackendHealthy()) {
      this.performILPOptimization();
    } else {
      console.error('Backend is not healthy, cannot perform optimization');
      // Show warning notification for backend not available
      this.notificationService.warning(
        'Backend service is not available. Please check the connection.',
        'Backend Unavailable'
      );
      // Trigger an immediate health check
      this.performHealthCheck();
    }
  }

  private performILPOptimization(): void {
    const employees = this.scheduleService.employees();
    const shifts = this.scheduleService.shifts();
    
    if (employees.length === 0 || shifts.length === 0) {
      // Show warning notification for missing data
      let message = 'Cannot optimize schedule: ';
      if (employees.length === 0 && shifts.length === 0) {
        message += 'No employees or shifts available.';
      } else if (employees.length === 0) {
        message += 'No employees available.';
      } else {
        message += 'No shifts available.';
      }
      message += ' Please import data first.';
      
      this.notificationService.warning(message, 'Missing Data');
      console.warn('No employees or shifts available for optimization');
      return;
    }

    // Use internal models directly - no conversion needed
    const backendEmployees = employees;
    const backendShifts = shifts;

    // Build constraints array based on selected options
    const constraints: string[] = [];
    const constraintOptions = this.ilpConstraints();
    
    if (constraintOptions.skillMatching) constraints.push(ConstraintType.SKILL_MATCHING);
    if (constraintOptions.overtimeLimits) constraints.push(ConstraintType.OVERTIME_LIMITS);
    if (constraintOptions.availabilityWindows) constraints.push(ConstraintType.AVAILABILITY_WINDOWS);
    if (constraintOptions.noOverlapping) constraints.push(ConstraintType.NO_OVERLAPPING);

    // Calculate period based on the first shift start date and the last shift end date
    // Format: "YYYY-MM-DD/YYYY-MM-DD"
    const shiftDates = shifts.map(shift => shift.startTime);
    const shiftEndDates = shifts.map(shift => shift.endTime);
    const earliestDate = new Date(Math.min(...shiftDates.map(date => date.getTime())));
    const latestDate = new Date(Math.max(...shiftEndDates.map(date => date.getTime())));
    // add on the lst date 1 day 
    latestDate.setDate(latestDate.getDate() + 1); // Include the last date fully in the period
    
    
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // Gets YYYY-MM-DD format
    };
    
    const period = `${formatDate(earliestDate)}/${formatDate(latestDate)}`;

    const optimizeRequest: OptimizeRequest = {
      period: period, 
      employees: backendEmployees.map(employee => employee.toEmployeeAPI()),
      shifts: backendShifts.map(shift => shift.toShiftAPI()),
      current_assignments: [], // Empty for now, not used by the backend
      constraints: constraints
    };

    this.backendService.optimizeSchedule(optimizeRequest).subscribe({
      next: (response) => {
        console.log('ILP optimization completed:', response);
        
        if (response.success) {
          // Apply the assignments to the schedule
          this.applyOptimizationResults(response);
          
          // Show success notification with detailed metrics
          const assignmentsCount = response.assignments?.length || 0;
          const unassignedCount = response.unassigned_shifts?.length || 0;
          const optimizationTime = response.metrics?.optimization_time_ms || 0;
          const constraintViolations = response.metrics?.constraint_violations || 0;
          const overtimeMinutes = response.metrics?.total_overtime_minutes || 0;
          
          let message = `Successfully optimized schedule! ${assignmentsCount} assignments made`;
          if (unassignedCount > 0) {
            message += `, ${unassignedCount} unassigned shifts`;
          }
          if (constraintViolations > 0) {
            message += `, ${constraintViolations} constraint violations`;
          }
          if (overtimeMinutes > 0) {
            message += `, ${overtimeMinutes} minutes of overtime`;
          }
          message += `. Completed in ${optimizationTime}ms.`;
          
          // Use warning if there are issues, success if everything is perfect
          if (unassignedCount > 0 || constraintViolations > 0) {
            this.notificationService.warning(message, 'ILP Optimization Complete (with issues)');
          } else {
            this.notificationService.success(message, 'ILP Optimization Complete');
          }
        } else {
          // Show error notification for failed optimization
          const errorMessage = response.message || 'Unknown optimization error';
          this.notificationService.error(
            `Optimization failed: ${errorMessage}`,
            'ILP Optimization Failed'
          );
          console.error('Optimization failed:', response.message);
        }
      },
      error: (error) => {
        // Show error notification for request failure
        this.notificationService.error(
          `Failed to connect to optimization service: ${error.message}`,
          'ILP Optimization Error'
        );
        console.error('ILP optimization failed:', error);
      }
    });
  }

  private applyOptimizationResults(response: OptimizeResponse): void {
    // Apply assignments to shifts
    const currentShifts = this.scheduleService.shifts();
    const updatedShifts = currentShifts.map(shift => {
      const assignment = response.assignments.find(a => a.shiftId === shift.id);
      if (assignment) {
        shift.assignedEmployeeId = assignment.employeeId;
      }
      return shift;
    });
    
    this.scheduleService.shifts.set(updatedShifts);
  }

  updateILPConstraint(constraint: keyof ILPConstraints, value: boolean): void {
    this.ilpConstraints.update(current => ({
      ...current,
      [constraint]: value
    }));
  }

  ngOnInit(): void {
    // Start periodic health checks
    this.startHealthChecking();
  }

  ngOnDestroy(): void {
    // Clean up the health check interval
    this.stopHealthChecking();
  }

  private startHealthChecking(): void {
    // Perform initial health check
    this.performHealthCheck();
    
    // Set up periodic health checking
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private performHealthCheck(): void {
    // Only perform health check if not currently optimizing
    if (!this.isOptimizing()) {
      this.backendService.checkHealth().subscribe({
        next: (healthResponse) => {
          // Health status is automatically updated in the service
          console.log('Health check result:', healthResponse.status);
        },
        error: (error) => {
          // Error handling is done in the service, this will set isBackendHealthy to false
          console.warn('Health check failed:', error.message);
        }
      });
    }
  }

 
}
