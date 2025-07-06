# Schedule Optimization Frontend


Angular application that schedule employees through optimization algorithms (Offline and online though backend ILP), featuring real-time data visualization, constraint-aware assignment algorithms, and seamless backend integration for optimal resource allocation.

## 📋 Table of Contents

- [🏗️ Architecture](#️-architecture)
- [🔄 Sequence Diagrams](#-sequence-diagrams)
- [🚀 Getting Started](#-getting-started)
- [📸 Screenshots](#-screenshots)
- [📈 Future Work](#-future-work)
- [📝 License](#-license)


## 🏗️ Architecture

### System Architecture  Architecture

```mermaid
graph TD
    subgraph "Main Application"
        App[App Component<br/>Root Container]
    end
    
    subgraph "Layout Components"
        Notification[Notification Component<br/>Global Notifications]
        Sidebar[Sidebar Component<br/>Navigation & Filters]
        Calendar[Calendar Component<br/>Calendar Container]
    end
    
    subgraph "Calendar Module"
        ScheduleHeader[Schedule Header<br/>Title & Actions]
        CalendarView[Calendar View Component<br/>View Switcher & Display Logic]
        Dashboard[Dashboard Component<br/>Analytics & Metrics<br/>Inside Calendar View]
            EmployeeCard[Employee Details Card<br/>Employee Information]
        ShiftCard[Shift Card Component<br/>Shift Details]
    end
    
    
    subgraph "Services"
        BackendService[Backend Service<br/>API Communication]
        ScheduleService[Schedule Service<br/>Data Processing]
        NotificationService[Notification Service<br/> Notifications Control]
    end
    
    %% Component Hierarchy
    App --> Sidebar
    App --> Calendar
    App --> Notification
    
    Calendar --> ScheduleHeader
    Calendar --> CalendarView
    
    CalendarView --> Dashboard
    CalendarView --> EmployeeCard
    CalendarView --> ShiftCard
    
    %% Service Dependencies (only main connections)
    ScheduleHeader --> BackendService
    Calendar --> ScheduleService
    Sidebar --> ScheduleService
    
    NotificationService --> Notification

    style App fill:#f3e5f5
    style Dashboard fill:#e1f5fe
    style Calendar fill:#e8f5e8
    style CalendarView fill:#fff9c4
    style Sidebar fill:#e3f2fd
    style NotificationService fill:#fff3e0
```

## 🔄 Sequence Diagrams

### Schedule Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant Sidebar
    participant ScheduleService
    participant ScheduleHeader
    participant BackendService
    participant HealthEndpoint
    participant ScheduleAPI
    participant NotificationService
    
    User->>Sidebar: Upload employee & shift CSV files
    Sidebar->>ScheduleService: importEmployeesFromCSV(csvData)
    Sidebar->>ScheduleService: importShiftsFromCSV(csvData)
    
    User->>ScheduleHeader: Click "ILP Optimization" 
    ScheduleHeader->>BackendService: checkHealthAndOptimize(optimizeRequest)
    BackendService->>HealthEndpoint: GET /api/health
    HealthEndpoint-->>BackendService: HTTP 200 + healthy_status
    
    BackendService->>ScheduleAPI: POST /api/schedule/optimize
    ScheduleAPI-->>BackendService: HTTP 200 + optimized_schedule
    BackendService-->>ScheduleHeader: OptimizeResponse
    ScheduleHeader->>ScheduleService: applyOptimizationResults(response)
    ScheduleHeader->>NotificationService: showSuccess/showWarning(optimizationMessage)
    ScheduleService-->>User: Display optimized schedule in CalendarView
    NotificationService-->>User: Show optimization results notification
```

### Offline Schedule Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant ScheduleHeader
    participant ScheduleService
    participant UtilsService
    participant CalendarView
    participant NotificationService
    
    User->>ScheduleHeader: Click "Offline Schedule"
    ScheduleHeader->>ScheduleService: generateScheduleOffline()
    ScheduleService->>ScheduleService: validateEmployeesAndShifts()
    
    alt Valid Data
        ScheduleService->>UtilsService: sortShiftsByDateTime(shifts)
        UtilsService-->>ScheduleService: sortedShifts
        
        loop For each shift
            ScheduleService->>ScheduleService: findBestEmployee(shift)
            ScheduleService->>ScheduleService: validateConstraints(employee, shift)
            ScheduleService->>ScheduleService: assignShift(employee, shift)
        end
        
        ScheduleService->>ScheduleService: updateScheduleSignal()
        ScheduleService->>NotificationService: showSuccess(scheduleGenerationMessage)
        ScheduleService-->>CalendarView: schedule_updated
        CalendarView-->>User: Display generated schedule
        NotificationService-->>User: Show success notification
    else Invalid Data
        ScheduleService->>NotificationService: showError(validationError)
        NotificationService-->>User: Show error notification
    end
```
## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (v9.0 or higher) - Comes with Node.js
- **Angular CLI** (v20.0 or higher)

```bash
npm install -g @angular/cli
```

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Andrew-Ayman123/time-schedule-manager
   cd time-schedule-manager/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify Angular CLI version**
   ```bash
   ng version
   ```

5. **Start the development server**
   ```bash
   ng serve --host "0.0.0.0" --port 3000
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000/`



### Sample Data

Use the provided sample CSV files to test the application:

- **Easy**: Simple 10-employee, 20-shift scenario
- **Medium**: Moderate complexity with 40 employees, 120 shifts
- **Complex**: Advanced scenario with 50 employees, 200 shifts

## 📸 Screenshots

### 1. Initial Application Page
*The landing page of the Schedule Optimization Frontend showing the clean, modern interface with navigation and welcome screen.*

![Initial Application Page](readme-assets/1-initial-page.jpeg)

### 2. Data Ingestion Interface
*The data upload interface where users can import employee and shift data via CSV files.*

![Data Ingestion Interface](readme-assets/2-ingest-date.jpeg)

### 3. Employee Management Sidebar
*The sidebar showing imported employee data with their details, skills, and availability information.*

![Employee Management Sidebar](readme-assets/3-sidebar-emp.jpeg)

### 4. Shift Management Sidebar
*The sidebar displaying imported shift data with shift details, requirements, and time slots.*

![Shift Management Sidebar](readme-assets/4-sidebar-shift.jpeg)

### 5. Unassigned Schedule - Week View
*Weekly calendar view showing unassigned shifts before optimization, highlighting scheduling gaps.*

![Unassigned Schedule - Week View](readme-assets/5-unassigned-week.jpeg)

### 6. Unassigned Schedule - Month View
*Monthly calendar view displaying unassigned shifts across the entire month before schedule generation.*

![Unassigned Schedule - Month View](readme-assets/6-unassigned-month.jpeg)

### 7. Unassigned Schedule - Dashboard View
*Dashboard analytics showing statistics and metrics for unassigned shifts and employee availability.*

![Unassigned Schedule - Dashboard View](readme-assets/7-unassigned-dash.jpeg)

### 8. Offline Schedule Generation
*The offline scheduling process in action, showing the local algorithm generating optimal assignments.*

![Offline Schedule Generation](readme-assets/8-offline-schedule.jpeg)

### 9. Assigned Schedule - Week View
*Weekly view after successful schedule optimization, showing assigned employees to their respective shifts.*

![Assigned Schedule - Week View](readme-assets/9-assigned-week.jpeg)

### 10. Assigned Schedule - Month View
*Monthly calendar view displaying the complete optimized schedule with all assignments across the month.*

![Assigned Schedule - Month View](readme-assets/10-assigned-month.jpeg)

### 11. Assigned Schedule - Dashboard View
*Analytics dashboard showing optimization results, assignment statistics, and performance metrics.*

![Assigned Schedule - Dashboard View](readme-assets/11-assignmed-dash.jpeg)

### 12. Online Optimization Output
*Results from the ILP (Integer Linear Programming) backend optimization showing detailed optimization metrics.*

![Online Optimization Output](readme-assets/12-online-output.jpeg)

### 13. Optimization Request Output
*Detailed request and response data from the backend optimization API, showing the optimization process flow.*

![Optimization Request Output](readme-assets/13-request-output.jpeg)


## 📈 Future Work

- [ ] **Real-time Collaboration Features**
  - [ ] WebSocket integration for live schedule updates
  - [ ] Multi-user editing with conflict resolution
  - [ ] Real-time notifications for schedule changes

- [ ] **Advanced UI/UX Improvements**
  - [ ] Dark mode theme support with user preference persistence
  - [ ] Drag-and-drop for data import

- [ ] **Enhanced Data Visualization & Analytics**
  - [ ] Advanced analytics dashboard with Chart.js integration
  - [ ] Employee workload distribution charts and heatmaps

- [ ] **Performance & Scalability**
  - [ ] Advanced caching strategies
  - [ ] Lazy loading of components and modules
  - [ ] State management optimization

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.