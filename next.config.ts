import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo: no puede pasar por el bundler.
  serverExternalPackages: ['better-sqlite3'],
  // El día del build, para Acerca de. Se fija acá y no en la página porque la
  // app entera es dinámica -el layout lee el user-agent-: un `new Date()` en la
  // página sería la hora de cada visita.
  env: { BUILD_DATE: new Date().toISOString().slice(0, 10) },
};

export default nextConfig;
