import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/auth-http';
import { addComment, listComments, getGame, COMMENT_PAGE_SIZE } from '@/lib/db';
import { authLimit } from '@/lib/accounts';
import { notFound, positiveId, rateLimited, toResponse } from '@/lib/errors';
const schema=z.object({body:z.string().trim().min(1).max(1000)});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  try { const id=positiveId((await params).id);if(!await getGame(id))throw notFound();
    const comments=await listComments(id,new URL(request.url).searchParams.get('cursor')||undefined);
    return NextResponse.json({ok:true,comments,nextCursor:comments.length===COMMENT_PAGE_SIZE?comments.at(-1)?.cursor:null});
  }catch(error){return toResponse(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try { sameOrigin(request);const user=await requireUser(),id=positiveId((await params).id);
    if(!await authLimit('comment',String(user.id),8,60))throw rateLimited();
    const input=schema.parse(await request.json());return NextResponse.json({ok:true,comment:await addComment(id,user,input.body)});
  }catch(error){return toResponse(error);}
}
