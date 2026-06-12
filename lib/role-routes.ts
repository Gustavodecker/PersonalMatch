export function getDashboardRoute(role: string | null | undefined): string {
  if (role === 'student') return '/student/dashboard';
  if (role === 'trainer') return '/trainer/dashboard';
  if (role === 'admin') return '/painel-restrito/dashboard';
  return '/';
}
