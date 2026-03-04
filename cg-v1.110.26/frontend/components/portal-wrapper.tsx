'use client';

/**
 * Portal Wrapper Component
 *
 * Automatically detects the current portal based on the route and injects
 * the appropriate portal class onto the body element for CSS theming.
 *
 * This component should wrap the entire application in the root layout.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { detectPortalFromPath, getPortalClassName } from '@/lib/portal-detector';

interface PortalWrapperProps {
  children: React.ReactNode;
}

export function PortalWrapper({ children }: PortalWrapperProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Detect the current portal based on pathname
    const portal = detectPortalFromPath(pathname);
    const portalClass = getPortalClassName(portal);

    // List of all possible portal classes
    const allPortalClasses = [
      'parent-portal',
      'professional-portal',
      'child-portal',
      'court-portal'
    ];

    // Remove all existing portal classes from body
    allPortalClasses.forEach(className => {
      document.body.classList.remove(className);
    });

    // Add the current portal class
    document.body.classList.add(portalClass);

    // Add transition class for smooth portal switching
    // (will be removed after transitions complete via CSS)
    document.body.classList.add('portal-transition');

    // Optional: Log portal changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PortalWrapper] Portal detected: ${portal} (${portalClass})`);
    }

    // Cleanup function (optional, for completeness)
    return () => {
      document.body.classList.remove('portal-transition');
    };
  }, [pathname]);

  // This component is purely for side effects; children are rendered unchanged
  return <>{children}</>;
}
