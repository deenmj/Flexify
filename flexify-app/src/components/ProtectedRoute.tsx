import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';

interface Props {
  children: React.ReactNode;
  roles?: string[];
  excludeRoles?: string[];
  requireCeo?: boolean;
}

/**
 * Role hierarchy map: maps every known role to the set of route-level
 * role tokens it should be granted access to.
 *
 * Example: a 'superadmin' user is always allowed through routes that
 * require 'admin', 'staff', or 'superadmin'.
 *
 * 'subadmin' is treated as an alias for 'staff'.
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: ['superadmin', 'admin', 'staff', 'subadmin', 'owner', 'user'],
  admin:      ['admin', 'staff', 'subadmin', 'owner', 'user'],
  staff:      ['staff', 'subadmin'],
  subadmin:   ['staff', 'subadmin'],
  owner:      ['owner', 'user'],
  user:       ['user'],
};

/** Where to send a user whose role doesn't match the required roles. */
const ROLE_HOME: Record<string, string> = {
  superadmin: '/ceo-master-portal',
  admin:      '/admin',
  staff:      '/staff',
  subadmin:   '/staff',
  owner:      '/dashboard',
  user:       '/dashboard',
};

export default function ProtectedRoute({ children, roles, excludeRoles, requireCeo }: Props) {
  const { user, loading } = useAuth();

  // ── TASK 1: STRICT LOADING BARRIER ──────────────────────────────
  // Never evaluate roles or redirect while auth state is still resolving.
  // This prevents the "impatient bouncer" 404 on page refresh.
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not authenticated at all → send to login
  if (!user) return <Navigate to="/auth" replace />;

  // ── Normalize role (defensive against casing & nesting) ─────────
  const currentRole = (user?.role || (user as any)?.data?.role || '').toString().toLowerCase().trim();

  // ── CEO gate ────────────────────────────────────────────────────
  if (requireCeo && currentRole !== 'superadmin') {
    return <Navigate to={ROLE_HOME[currentRole] || '/'} replace />;
  }

  // ── TASK 2: BULLETPROOF ROLE EVALUATION ─────────────────────────
  if (roles && roles.length > 0) {
    // Normalize allowedRoles to lowercase for comparison
    const allowedLower = roles.map(r => r.toLowerCase().trim());

    // Direct match (case-insensitive)
    const directMatch = allowedLower.includes(currentRole);

    // Hierarchy match: does the user's role grant them access to any of the allowed roles?
    const grantedRoles = ROLE_HIERARCHY[currentRole] || [];
    const hierarchyMatch = allowedLower.some(allowed => grantedRoles.includes(allowed));

    // Legacy isStaff flag support (some users have role='user' but isStaff=true)
    const isStaffFlagged = user.isStaff === true && allowedLower.includes('staff');

    if (!directMatch && !hierarchyMatch && !isStaffFlagged) {
      console.warn(
        `[ProtectedRoute] Access denied — role '${currentRole}' not in allowed:`,
        roles,
        '| Granted hierarchy:', grantedRoles
      );
      // Redirect to the user's natural home, not a generic 403
      return <Navigate to={ROLE_HOME[currentRole] || '/unauthorized'} replace />;
    }
  }

  // ── Exclude-roles check ─────────────────────────────────────────
  if (excludeRoles && excludeRoles.length > 0) {
    const excludedLower = excludeRoles.map(r => r.toLowerCase().trim());
    if (excludedLower.includes(currentRole)) {
      return <Navigate to={ROLE_HOME[currentRole] || '/unauthorized'} replace />;
    }
  }

  // ── All checks passed ──────────────────────────────────────────
  return <>{children}</>;
}
