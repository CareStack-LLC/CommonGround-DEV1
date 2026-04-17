/**
 * /superadmin/kidspace is a duplicate of /superadmin/growth's kidspace tab.
 * Kept as a redirect stub so any bookmarked links continue to work.
 */

import { redirect } from 'next/navigation';

export default function KidspaceRedirect() {
  redirect('/superadmin/growth?tab=kidspace');
}
