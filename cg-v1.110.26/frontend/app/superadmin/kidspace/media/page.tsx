/**
 * /superadmin/kidspace/media is a duplicate of /superadmin/media-library.
 * Kept as a redirect stub so any bookmarked links continue to work.
 */

import { redirect } from 'next/navigation';

export default function KidspaceMediaRedirect() {
  redirect('/superadmin/media-library');
}
