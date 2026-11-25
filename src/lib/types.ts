export type GameStatus = 'submitted' | 'planned' | 'playing' | 'played' | 'rejected';

export type GamesUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: 'ADMIN' | 'USER';
};

export type GameSummary = {
  id: number;
  steamAppId: number;
  slug: string;
  title: string;
  shortDescription: string;
  headerImage: string;
  releaseDate: string;
  releaseTimestamp: string | null;
  genres: string[];
  modes: string[];
  status: GameStatus;
  ownerScore: number | null;
  score: number;
  voteCount: number;
  submissionCount: number;
  createdAt: string;
};

export type Submitter = {
  userId: string;
  username: string;
  createdAt: string;
};

export type GameDetail = GameSummary & {
  about: string;
  website: string | null;
  developers: string[];
  publishers: string[];
  screenshots: string[];
  priceText: string;
  submitters: Submitter[];
  userVote: number;
};

export type GameComment = {
  userId: number;
  cursor: string;
  id: number;
  username: string;
  body: string;
  createdAt: string;
};

