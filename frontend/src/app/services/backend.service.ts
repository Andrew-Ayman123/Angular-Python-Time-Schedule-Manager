import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
    Employee, Shift, HealthResponse,
    OptimizeRequest,
    OptimizeResponse,
    ConstraintType
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class BackendService {
    private readonly baseUrl = 'http://localhost:8000/api';

    // Signals for state management
    isBackendHealthy = signal<boolean>(false);
    isOptimizing = signal<boolean>(false);
    lastOptimizationResult = signal<OptimizeResponse | null>(null);

    constructor(private http: HttpClient) { }

    /**
     * Check backend health status
     */
    checkHealth(): Observable<HealthResponse> {
        return this.http.get<HealthResponse>(`${this.baseUrl}/health`).pipe(
            map(response => {
                this.isBackendHealthy.set(response.status === 'healthy');
                return response;
            }),
            catchError((error) => {
                // Set backend as unhealthy when there's an error
                this.isBackendHealthy.set(false);
                return this.handleError(error);
            })
        );
    }

    /**
     * Optimize schedule using ILP
     */
    optimizeSchedule(request: OptimizeRequest): Observable<OptimizeResponse> {
        this.isOptimizing.set(true);

        return this.http.post<OptimizeResponse>(`${this.baseUrl}/schedule/optimize`, request).pipe(
            map(response => {
                this.lastOptimizationResult.set(response);
                this.isOptimizing.set(false);
                return response;
            }),
            catchError((error) => {
                this.isOptimizing.set(false);
                return this.handleError(error);
            })
        );
    }

    /**
     * Check if backend is available and optimize if healthy
     */
    checkHealthAndOptimize(request: OptimizeRequest): Observable<OptimizeResponse> {
        return this.checkHealth().pipe(
            switchMap((healthResponse: HealthResponse) => {
                if (healthResponse.status !== 'healthy') {
                    throw new Error('Backend is not healthy');
                }
                return this.optimizeSchedule(request);
            }),
            catchError(error => {
                throw new Error('Backend health check failed: ' + error.message);
            })
        );
    }

    /**
     * Reset optimization state
     */
    resetOptimizationState(): void {
        this.lastOptimizationResult.set(null);
        this.isOptimizing.set(false);
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Client Error: ${error.error.message}`;
        } else {
            // Server-side error
            errorMessage = `Server Error: ${error.status} - ${error.message}`;
            if (error.error?.message) {
                errorMessage += ` - ${error.error.message}`;
            }
        }

        console.error('Backend Service Error:', errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
