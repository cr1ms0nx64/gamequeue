'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, LogIn, MessageSquare, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { initials, relativeDate } from '@/lib/format';
import type { GameComment, GamesUser } from '@/lib/types';

export function VotePanel({
  gameId,
  initialScore,
  initialVoteCount,
  initialUserVote,
  user
}: {
  gameId: number;
  initialScore: number;
  initialVoteCount: number;
  initialUserVote: number;
  user: GamesUser | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [busy, setBusy] = useState(false);

  async function vote(value: -1 | 1) {
    if (!user || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/games/${gameId}/vote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value })
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok) {
        setScore(payload.vote.score);
        setVoteCount(payload.vote.voteCount);
        setUserVote(payload.vote.userVote);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vote-panel">
      <p className="eyebrow">Community Bewertung</p>
      <div className="vote-controls">
        <button
          className={userVote === 1 ? 'active up' : ''}
          disabled={!user || busy}
          onClick={() => vote(1)}
          title={user ? 'Positiv bewerten' : 'Zum Bewerten anmelden'}
          type="button"
        >
          <ThumbsUp />
        </button>
        <strong className={score < 0 ? 'negative' : ''}>{score > 0 ? `+${score}` : score}</strong>
        <button
          className={userVote === -1 ? 'active down' : ''}
          disabled={!user || busy}
          onClick={() => vote(-1)}
          title={user ? 'Negativ bewerten' : 'Zum Bewerten anmelden'}
          type="button"
        >
          <ThumbsDown />
        </button>
      </div>
      <small>{voteCount} {voteCount === 1 ? 'Stimme' : 'Stimmen'}</small>
      {!user ? <Link className="vote-login" href={`/login?next=/game/${gameId}`}><LogIn /> Zum Abstimmen anmelden</Link> : null}
    </div>
  );
}

export function CommentsPanel({
  gameId,
  initialComments,
  user
}: {
  gameId: number;
  initialComments: GameComment[];
  user: GamesUser | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [cursor,setCursor]=useState(initialComments.length===25?initialComments.at(-1)?.cursor:null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/games/${gameId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Kommentar konnte nicht gespeichert werden.');
      setComments((items) => [payload.comment, ...items]);
      setBody('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kommentar konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(comment:GameComment) {
    if(!window.confirm('Diesen Kommentar wirklich löschen?'))return;
    setBusy(true);setError('');
    try {const response=await fetch(`/api/games/${gameId}/comments/${comment.id}`,{method:'DELETE'});const payload=await response.json();if(!response.ok)throw new Error(payload.error);setComments(items=>items.filter(item=>item.id!==comment.id));}
    catch(error){setError(error instanceof Error?error.message:'Löschen fehlgeschlagen.');}finally{setBusy(false);}
  }
  async function loadMore() {
    if(!cursor)return;setBusy(true);setError('');
    try{const response=await fetch(`/api/games/${gameId}/comments?cursor=${encodeURIComponent(cursor)}`);const payload=await response.json();if(!response.ok)throw new Error(payload.error);setComments(items=>[...items,...payload.comments.filter((next:GameComment)=>!items.some(item=>item.id===next.id))]);setCursor(payload.nextCursor);}
    catch(error){setError(error instanceof Error?error.message:'Kommentare konnten nicht geladen werden.');}finally{setBusy(false);}
  }

  return (
    <section className="comments-section">
      <header>
        <div>
          <p className="eyebrow"><MessageSquare /> Community</p>
          <h2>Kommentare</h2>
        </div>
        <span>{comments.length}</span>
      </header>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <span className="user-avatar">{initials(user.displayName || user.username)}</span>
          <label>
            <span className="sr-only">Kommentar</span>
            <textarea
              maxLength={1000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Was meinst du zu dem Spiel?"
              rows={3}
              value={body}
            />
            <span className="comment-form-footer">
              <small>{body.length}/1000</small>
              <button className="button button-primary" disabled={busy || !body.trim()} type="submit">
                {busy ? <LoaderCircle className="spin" /> : <Send />}
                Senden
              </button>
            </span>
          </label>
        </form>
      ) : (
        <div className="comment-login">
          <MessageSquare />
          <span><strong>Diskussion beitreten</strong><small>Melde dich an, um einen Kommentar zu schreiben.</small></span>
          <Link className="button button-secondary" href={`/login?next=/game/${gameId}`}>Anmelden</Link>
        </div>
      )}
      {error ? <p className="notice notice-error">{error}</p> : null}

      {cursor && <button type="button" className="button button-secondary" disabled={busy} onClick={loadMore}>Weitere Kommentare laden</button>}
      <div className="comment-list">
        {comments.length ? comments.map((comment) => (
          <article className="comment" key={comment.id}>
            <span className="user-avatar">{initials(comment.username)}</span>
            <div>
              <header><strong>{comment.username}</strong><time>{relativeDate(comment.createdAt)}</time></header>
              <p>{comment.body}</p>{user && (user.role==='ADMIN'||user.id===comment.userId) && <button type="button" disabled={busy} onClick={()=>removeComment(comment)}>Löschen</button>}
            </div>
          </article>
        )) : (
          <div className="empty-comments">
            <MessageSquare />
            <p>Noch keine Kommentare. Der erste Platz ist frei.</p>
          </div>
        )}
      </div>
    </section>
  );
}

