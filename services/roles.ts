export type BackendRole = 'student' | 'faculty' | 'instructor' | 'admin' | string | undefined | null;
export type AppRole = 'student' | 'faculty';

export const isFacultyRole = (role: BackendRole): boolean =>
  role === 'faculty' || role === 'instructor' || role === 'admin';

export const toAppRole = (role: BackendRole): AppRole =>
  isFacultyRole(role) ? 'faculty' : 'student';

export const roleLabel = (role: BackendRole): string =>
  isFacultyRole(role) ? 'Faculty' : 'Student';

export const dashboardPathForRole = (role: BackendRole): string =>
  isFacultyRole(role) ? '/faculty-dashboard' : '/dashboard';
