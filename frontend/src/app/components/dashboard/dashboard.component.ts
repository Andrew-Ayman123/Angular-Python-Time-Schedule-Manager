import { Component, OnInit, computed, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Employee } from '../../models/employee.model';
import { Shift } from '../../models/shift.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatGridListModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  employees = input.required<Employee[]>();
  shifts = input.required<Shift[]>();

  // Statistics computed signals
  totalShifts = computed(() => this.shifts().length);
  assignedShifts = computed(() => this.shifts().filter(shift => shift.isAssigned()).length);
  unassignedShifts = computed(() => this.shifts().filter(shift => !shift.isAssigned()).length);
  totalEmployees = computed(() => this.employees().length);
  
  assignmentRate = computed(() => {
    const total = this.totalShifts();
    return total > 0 ? Math.round((this.assignedShifts() / total) * 100) : 0;
  });

  totalHours = computed(() => {
    return this.shifts().reduce((total, shift) => total + shift.getDuration(), 0);
  });

  averageShiftsPerEmployee = computed(() => {
    const employees = this.totalEmployees();
    const assigned = this.assignedShifts();
    return employees > 0 ? Math.round((assigned / employees) * 10) / 10 : 0;
  });

  // Chart data
  assignmentChartData = signal<ChartData<'doughnut'>>({
    labels: ['Assigned', 'Unassigned'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#4CAF50', '#FF9800'],
      hoverBackgroundColor: ['#45a049', '#e68900']
    }]
  });

  roleDistributionChartData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [{
      label: 'Shifts by Role',
      data: [],
      backgroundColor: '#2196F3',
      hoverBackgroundColor: '#1976D2'
    }]
  });

  weeklyHoursChartData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [{
      label: 'Hours',
      data: [],
      borderColor: '#9C27B0',
      backgroundColor: 'rgba(156, 39, 176, 0.1)',
      tension: 0.4
    }]
  });

  employeeWorkloadChartData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [{
      label: 'Assigned Shifts',
      data: [],
      backgroundColor: '#FF5722',
      hoverBackgroundColor: '#E64A19'
    }]
  });

  // Chart options
  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const dataset = context.dataset.data as number[];
            const total = dataset.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  ngOnInit() {
    this.updateCharts();
  }

  ngOnChanges() {
    this.updateCharts();
  }

  private updateCharts() {
    this.updateAssignmentChart();
    this.updateRoleDistributionChart();
    this.updateWeeklyHoursChart();
    this.updateEmployeeWorkloadChart();
  }

  private updateAssignmentChart() {
    this.assignmentChartData.set({
      labels: ['Assigned', 'Unassigned'],
      datasets: [{
        data: [this.assignedShifts(), this.unassignedShifts()],
        backgroundColor: ['#4CAF50', '#FF9800'],
        hoverBackgroundColor: ['#45a049', '#e68900']
      }]
    });
  }

  private updateRoleDistributionChart() {
    const roleCount = new Map<string, number>();
    this.shifts().forEach(shift => {
      const count = roleCount.get(shift.title) || 0;
      roleCount.set(shift.title, count + 1);
    });

    const labels = Array.from(roleCount.keys());
    const data = Array.from(roleCount.values());

    this.roleDistributionChartData.set({
      labels,
      datasets: [{
        label: 'Shifts by Role',
        data,
        backgroundColor: '#2196F3',
        hoverBackgroundColor: '#1976D2'
      }]
    });
  }

  private updateWeeklyHoursChart() {
    const weeklyHours = new Map<string, number>();
    const today = new Date();
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      weeklyHours.set(dateStr, 0);
    }

    // Calculate hours for each day
    this.shifts().forEach(shift => {
      const shiftDate = shift.date;
      if (weeklyHours.has(shiftDate)) {
        const currentHours = weeklyHours.get(shiftDate) || 0;
        weeklyHours.set(shiftDate, currentHours + shift.getDuration());
      }
    });

    const labels = Array.from(weeklyHours.keys()).map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    const data = Array.from(weeklyHours.values());

    this.weeklyHoursChartData.set({
      labels,
      datasets: [{
        label: 'Hours',
        data,
        borderColor: '#9C27B0',
        backgroundColor: 'rgba(156, 39, 176, 0.1)',
        tension: 0.4
      }]
    });
  }

  private updateEmployeeWorkloadChart() {
    const employeeWorkload = new Map<string, number>();
    
    // Initialize all employees with 0 shifts
    this.employees().forEach(emp => {
      employeeWorkload.set(emp.name, 0);
    });

    // Count assigned shifts per employee
    this.shifts().forEach(shift => {
      if (shift.assignedEmployeeId) {
        const employee = this.employees().find(emp => emp.id === shift.assignedEmployeeId);
        if (employee) {
          const currentCount = employeeWorkload.get(employee.name) || 0;
          employeeWorkload.set(employee.name, currentCount + 1);
        }
      }
    });

    const labels = Array.from(employeeWorkload.keys());
    const data = Array.from(employeeWorkload.values());

    this.employeeWorkloadChartData.set({
      labels,
      datasets: [{
        label: 'Assigned Shifts',
        data,
        backgroundColor: '#FF5722',
        hoverBackgroundColor: '#E64A19'
      }]
    });
  }

  getTopPerformers(): { name: string; shifts: number; hours: number }[] {
    const employeeStats = new Map<string, { shifts: number; hours: number }>();

    this.employees().forEach(emp => {
      employeeStats.set(emp.id, { shifts: 0, hours: 0 });
    });

    this.shifts().forEach(shift => {
      if (shift.assignedEmployeeId) {
        const stats = employeeStats.get(shift.assignedEmployeeId);
        if (stats) {
          stats.shifts++;
          stats.hours += shift.getDuration();
        }
      }
    });

    return this.employees()
      .map(emp => ({
        name: emp.name,
        shifts: employeeStats.get(emp.id)?.shifts || 0,
        hours: Math.round((employeeStats.get(emp.id)?.hours || 0) * 10) / 10
      }))
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 5);
  }

  getUnassignedShiftsByRole(): { role: string; count: number }[] {
    const roleCount = new Map<string, number>();
    
    this.shifts()
      .filter(shift => !shift.isAssigned())
      .forEach(shift => {
        const count = roleCount.get(shift.title) || 0;
        roleCount.set(shift.title, count + 1);
      });

    return Array.from(roleCount.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }
}
