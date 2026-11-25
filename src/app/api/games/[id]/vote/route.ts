import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/auth-http';
import { setVote } from '@/lib/db';
import { authLimit } from '@/lib/accounts';
import { positiveId, rateLimited, toResponse } from '@/lib/errors';
const schema=z.object({value:z.union([z.literal(-1),z.literal(1)])});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {sameOrigin(request);const user=await requireUser();const id=positiveId((await params).id);
    if(!await authLimit('vote',String(user.id),30,60))throw rateLimited();
    const input=schema.parse(await request.json());return NextResponse.json({ok:true,vote:await setVote(id,user,input.value)});
  }catch(error){return toResponse(error);}
}
