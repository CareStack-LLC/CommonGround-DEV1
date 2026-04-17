/**
 * /superadmin/status is a duplicate of /superadmin/system-health's services
 * tab. Kept as a redirect stub so any bookmarked links continue to work.
 */

import { redirect } from 'next/navigation';

export default function StatusRedirect() {
  redirect('/superadmin/system-health');
}
