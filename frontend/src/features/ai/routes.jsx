import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { AiCenterPage } from './pages/AiCenterPage';

// Module Intelligence Artificielle (fonctions intégrées dans tous les modules ;
// le Centre IA les présente et mesure leur qualité).

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const aiAdminRoutes = [
  {
    path: 'ai',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.AI_INSIGHTS]}>
        <AiCenterPage />
      </ProtectedRoute>
    ),
  },
];
