import { currentUser } from '@/lib/auth';
import { HeaderClient } from '@/components/HeaderClient';

export async function Header() {
  const user = await currentUser();
  return <HeaderClient user={user} />;
}

