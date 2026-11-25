import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/auth-http';
import { deleteComment } from '@/lib/db';
import { positiveId, rateLimited, toResponse } from '@/lib/errors';
import { authLimit } from '@/lib/accounts';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;commentId:string}>}) {
  try {sameOrigin(request);const user=await requireUser();if(!await authLimit('comment-delete',String(user.id),30,60))throw rateLimited();
    const input=await params;await deleteComment(positiveId(input.id),positiveId(input.commentId),user);return NextResponse.json({ok:true});
  }catch(error){return toResponse(error);}
}
