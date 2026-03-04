/**
 * Portal Detection Utility
 *
 * Automatically detects which portal the user is in based on the current route
 * and provides the appropriate portal class name for CSS theming.
 */

export type PortalType = 'parent' | 'professional' | 'child' | 'court' | 'marketing';

/**
 * Detects the portal type based on the current pathname
 *
 * @param pathname - The current route pathname (from usePathname() or window.location.pathname)
 * @returns The detected portal type
 *
 * @example
 * detectPortalFromPath('/dashboard') // returns 'parent'
 * detectPortalFromPath('/professional/cases') // returns 'professional'
 * detectPortalFromPath('/my-circle/child/dashboard') // returns 'child'
 */
export function detectPortalFromPath(pathname: string): PortalType {
  // Court portal - GAL and judicial access
  if (pathname.startsWith('/court-portal')) {
    return 'court';
  }

  // Professional portal - attorneys, mediators, paralegals
  if (pathname.startsWith('/professional')) {
    return 'professional';
  }

  // Child portal - KidComs and child-focused features
  if (pathname.startsWith('/my-circle/child') || pathname.startsWith('/kidcoms')) {
    return 'child';
  }

  // Marketing pages - public-facing informational pages
  const marketingPaths = [
    '/about',
    '/features',
    '/pricing',
    '/professionals',
    '/login',
    '/register',
    '/blog',
    '/contact',
    '/faq',
    '/privacy',
    '/terms'
  ];

  if (marketingPaths.some(path => pathname.startsWith(path))) {
    return 'marketing';
  }

  // Default to parent portal for all other routes
  // This includes: /, /dashboard, /family-files, /messages, /schedule, /agreements, /payments, etc.
  return 'parent';
}

/**
 * Returns the CSS class name for the given portal type
 *
 * @param portal - The portal type
 * @returns The corresponding CSS class name to apply to body element
 *
 * @example
 * getPortalClassName('parent') // returns 'parent-portal'
 * getPortalClassName('professional') // returns 'professional-portal'
 */
export function getPortalClassName(portal: PortalType): string {
  // Marketing pages use parent portal theme (warm, inviting)
  if (portal === 'marketing') {
    return 'parent-portal';
  }

  return `${portal}-portal`;
}

/**
 * Gets the portal display name for UI purposes
 *
 * @param portal - The portal type
 * @returns Human-readable portal name
 */
export function getPortalDisplayName(portal: PortalType): string {
  const displayNames: Record<PortalType, string> = {
    parent: 'Parent Portal',
    professional: 'Professional Portal',
    child: 'Kids Portal',
    court: 'Court Portal',
    marketing: 'CommonGround'
  };

  return displayNames[portal];
}

/**
 * Checks if the current user should see the portal switcher
 *
 * @param userRole - The user's role(s)
 * @returns True if the user has access to multiple portals
 */
export function shouldShowPortalSwitcher(userRole: {
  isParent?: boolean;
  isProfessional?: boolean;
  isCourtOfficial?: boolean;
}): boolean {
  const roleCount = [
    userRole.isParent,
    userRole.isProfessional,
    userRole.isCourtOfficial
  ].filter(Boolean).length;

  return roleCount > 1;
}
