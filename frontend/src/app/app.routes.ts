import { Routes } from '@angular/router';
import { App } from './app';
export const routes: Routes = [
  { path: '', redirectTo: '/schedule', pathMatch: 'full' },
  { path: 'schedule', component: App },
  { path: '**', redirectTo: '/schedule' }
];
