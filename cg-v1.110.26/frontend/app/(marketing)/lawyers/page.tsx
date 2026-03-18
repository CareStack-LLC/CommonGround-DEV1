import { redirect } from 'next/navigation';

/**
 * /lawyers now redirects to /professionals.
 * All family law professionals (attorneys, mediators, GALs,
 * custody evaluators, parenting coordinators) are served
 * by the unified /professionals page.
 */
export default function LawyersRedirect() {
  redirect('/professionals');
}
