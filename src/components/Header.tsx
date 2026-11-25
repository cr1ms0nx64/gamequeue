import { siteBranding } from '@/lib/branding';
import { currentUser } from '@/lib/auth';
import { HeaderClient } from '@/components/HeaderClient';

export async function Header() {
  const [user,branding] = await Promise.all([currentUser(),siteBranding()]);
  return <HeaderClient user={user} branding={branding} />;
}

