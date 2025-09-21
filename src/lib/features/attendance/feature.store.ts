import { writable } from 'svelte/store';

interface AttendanceFeatureState {
  open: boolean;
}

export const attendanceState = writable<AttendanceFeatureState>({
  open: false
});
