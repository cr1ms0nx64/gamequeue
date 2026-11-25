import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/auth-http';
import { authLimit } from '@/lib/accounts';
import { exportAccount } from '@/lib/repos/account-data';
import { rateLimited,toResponse } from '@/lib/errors';
export async function POST(request:Request) {
  try {sameOrigin(request);const user=await requireUser();if(!await authLimit('account-export',String(user.id),5))throw rateLimited();
    return NextResponse.json(await exportAccount(user.id),{headers:{'Content-Disposition':'attachment; filename="gamequeue-account.json"','Cache-Control':'no-store'}});
  }catch(error){return toResponse(error);}
}
