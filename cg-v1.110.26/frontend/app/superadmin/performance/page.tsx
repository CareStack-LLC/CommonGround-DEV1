/**
 * /superadmin/performance is a duplicate of /superadmin/system-health's
 * performance tab. Kept as a redirect stub so any bookmarked links continue
 * to work.
 */

import { redirect } from 'next/navigation';

export default function PerformanceRedirect() {
  redirect('/superadmin/system-health?tab=performance');
}
