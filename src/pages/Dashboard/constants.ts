import { StatusOption } from './types';

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'present', label: 'Present', color: '#22c55e' },
  { value: 'absent', label: 'Absent', color: '#ef4444' },
  { value: 'late', label: 'Late', color: '#eab308' },
  { value: 'leave', label: 'Leave', color: '#2563eb' },
];

export const DELETE_OPTION: StatusOption = { 
  value: 'DELETE', 
  label: 'Delete', 
  color: '#ef4444' 
};

// Cache TTL constants
export const REQUEST_CACHE_TTL = 30000; // 30 seconds
export const SESSION_CACHE_TTL = 60000; // 1 minute
export const TAB_CACHE_TTL = 300000; // 5 minutes

// Dummy data mode flag (set to true to use dummy data for testing, false to use real database)
export const USE_DUMMY_DATA = false;

