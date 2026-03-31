export type ChallengeSource = "ai" | "static";
export type ChallengeType = "multiple_choice";

export type Challenge = {
  id: string;
  ad_id: string;
  type: ChallengeType;
  question: string;
  options: string[];
  source: ChallengeSource;
};

export type ChallengeResponse = {
  challenge: Challenge;
  fallback_used: boolean;
  pool_size_after_consume: number;
  refill_requested: boolean;
};

export type NoChallengeErrorResponse = {
  error: "NO_CHALLENGE_AVAILABLE";
  message: string;
};