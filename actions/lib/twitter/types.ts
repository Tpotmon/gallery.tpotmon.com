export interface Tweet {
  type: string;
  id: string;
  url: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId?: string;
  conversationId?: string;
  inReplyToUserId?: string;
  inReplyToUsername?: string;
}

export interface TweetsApiResponse {
  data?: {
    pin_tweet: Tweet | null;
    tweets: Tweet[];
  };
  tweets?: Tweet[];
  has_next_page: boolean;
  next_cursor: string;
  status: string;
  message: string;
}

export interface TweetsErrorResponse {
  error: number;
  message: string;
}

export interface TwitterProfile {
  type: string;
  userName: string;
  url: string;
  id: string;
  name: string;
  isBlueVerified: boolean;
  verifiedType?: string;
  profilePicture: string;
  coverPicture: string;
  description: string;
  location: string;
  followers: number;
  following: number;
  canDm: boolean;
  createdAt: string;
  favouritesCount: number;
  hasCustomTimelines: boolean;
  isTranslator: boolean;
  mediaCount: number;
  statusesCount: number;
  withheldInCountries: string[];
  affiliatesHighlightedLabel: object;
  possiblySensitive: boolean;
  pinnedTweetIds: string[];
  isAutomated: boolean;
  automatedBy: string;
  unavailable: boolean;
  message: string;
  unavailableReason: string;
  profile_bio: {
    description: string;
    entities: {
      description: {
        urls: {
          display_url: string;
          expanded_url: string;
          indices: number[];
          url: string;
        }[];
      };
      url: {
        urls: {
          display_url: string;
          expanded_url: string;
          indices: number[];
          url: string;
        }[];
      };
    };
  };
}

export interface TwitterProfileApiResponse {
  status: string;
  msg: string;
  data: TwitterProfile;
}

export interface TwitterProfileErrorResponse {
  error: number;
  message: string;
}

export interface BatchUserInfoResponse {
  users: TwitterProfile[];
  status: string;
  msg: string;
}

export interface BatchUserInfoErrorResponse {
  error: number;
  message: string;
}
