import { writable } from 'svelte/store';

interface GradeFeatureState {
  entryOpen: boolean;
}

export const gradeState = writable<GradeFeatureState>({
  entryOpen: false
});
