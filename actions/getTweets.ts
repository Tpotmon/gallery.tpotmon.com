import { DatabaseManager } from './lib/database';

export interface GetTweetsConfig {
  mongoConnectionString: string;
  twitterApiKey: string;
  delayBetweenUsers?: number;
  maxTweetsPerUser?: number;
  onlyStaleProfiles?: boolean;
  staleHours?: number;
  maxPagesPerUser?: number;
  delayBetweenPages?: number;
}

export interface TweetFailureRecord {
  profileId: string;
  username?: string;
  reason: string;
  error?: string;
  failureType: 'api_error' | 'save_error' | 'fetch_error';
}

export class TweetCollector {
  private db: DatabaseManager;
  private config: GetTweetsConfig;
  private failureRecords: TweetFailureRecord[] = [];

  constructor(config: GetTweetsConfig) {
    this.config = {
      delayBetweenUsers: 1000, // 1 second between users
      maxTweetsPerUser: 100,
      onlyStaleProfiles: false,
      staleHours: 24,
      maxPagesPerUser: 3, // Fetch 3 pages to catch engagement updates
      delayBetweenPages: 500, // 0.5 seconds between pages
      ...config
    };
    this.db = new DatabaseManager(config.mongoConnectionString);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing tweet collector...');
    console.log(`   └── Delay between users: ${this.config.delayBetweenUsers}ms`);
    console.log(`   └── Max tweets per user: ${this.config.maxTweetsPerUser}`);
    console.log(`   └── Max pages per user: ${this.config.maxPagesPerUser}`);
    console.log(`   └── Delay between pages: ${this.config.delayBetweenPages}ms`);
    console.log(`   └── Only stale profiles: ${this.config.onlyStaleProfiles}`);
    if (this.config.onlyStaleProfiles) {
      console.log(`   └── Stale threshold: ${this.config.staleHours} hours`);
    }
    
    await this.db.connect();
    await this.db.createIndexes();
    console.log('✅ Tweet collector initialization complete');
  }

  async collectAllTweets(): Promise<void> {
    console.log('🐦 Starting tweet collection...');
    console.log('==============================');
    
    // Get profiles to collect tweets from
    const profiles = this.config.onlyStaleProfiles 
      ? await this.db.getStaleProfiles(this.config.staleHours)
      : await this.db.getAllProfiles();

    if (profiles.length === 0) {
      console.log('📊 No profiles found to collect tweets from');
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles to collect tweets from`);
    console.log('==============================\n');

    let totalTweets = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const progress = `[${i + 1}/${profiles.length}]`;
      
      console.log(`🐦 ${progress} Collecting tweets for @${profile.username} (ID: ${profile.profileId})`);

      try {
        const tweets = await this.fetchUserTweets(profile.username);
        
        if (tweets.length === 0) {
          console.log(`   └── No tweets found for @${profile.username}`);
        } else {
          console.log(`   └── Found ${tweets.length} tweets`);
          
          for (const tweet of tweets) {
            try {
              await this.db.saveTweet(tweet, profile.profileId, profile.username);
              totalTweets++;
            } catch (saveError) {
              totalFailed++;
              const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
              console.error(`   └── ❌ Failed to save tweet ${tweet.id}: ${errorMessage}`);
              
              this.failureRecords.push({
                profileId: profile.profileId,
                username: profile.username,
                reason: `Failed to save tweet ${tweet.id}: ${errorMessage}`,
                error: errorMessage,
                failureType: 'save_error'
              });
            }
          }
        }

        totalUpdated++;
        console.log(`   └── ✅ Completed @${profile.username}`);

      } catch (fetchError) {
        totalFailed++;
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error(`   └── ❌ Failed to fetch tweets for @${profile.username}: ${errorMessage}`);
        
        this.failureRecords.push({
          profileId: profile.profileId,
          username: profile.username,
          reason: `Failed to fetch tweets: ${errorMessage}`,
          error: errorMessage,
          failureType: 'fetch_error'
        });
      }

      // Progress report
      const progressPercent = ((i + 1) / profiles.length * 100).toFixed(1);
      console.log(`📈 Progress: ${i + 1}/${profiles.length} (${progressPercent}%)`);

      // Delay between users (except for the last one)
      if (i < profiles.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenUsers}ms before next user...\n`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenUsers));
      } else {
        console.log('');
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerProfile = totalTime / profiles.length;

    console.log(`🎉 TWEET COLLECTION COMPLETED!`);
    console.log('==============================');
    console.log(`👥 Total profiles: ${profiles.length}`);
    console.log(`✅ Successfully processed: ${totalUpdated}`);
    console.log(`🐦 Total tweets collected: ${totalTweets}`);
    console.log(`❌ Failed profiles: ${totalFailed}`);
    console.log(`📈 Success rate: ${((totalUpdated / profiles.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`⚡ Average time per profile: ${Math.round(avgTimePerProfile)}ms`);
    console.log('==============================');

    // Detailed failure reporting
    if (this.failureRecords.length > 0) {
      console.log(`\n🔍 DETAILED FAILURE REPORT`);
      console.log('==========================');
      
      // Group failures by type
      const failuresByType = this.failureRecords.reduce((acc, failure) => {
        if (!acc[failure.failureType]) {
          acc[failure.failureType] = [];
        }
        acc[failure.failureType].push(failure);
        return acc;
      }, {} as Record<string, TweetFailureRecord[]>);

      // Report each failure type
      Object.entries(failuresByType).forEach(([type, failures]) => {
        console.log(`\n📋 ${type.toUpperCase().replace('_', ' ')} (${failures.length} failures):`);
        console.log('─'.repeat(50));
        
        failures.forEach((failure, index) => {
          console.log(`${index + 1}. @${failure.username} (ID: ${failure.profileId})`);
          console.log(`   └── Reason: ${failure.reason}`);
          if (failure.error) {
            console.log(`   └── Error: ${failure.error}`);
          }
        });
      });

      console.log(`\n📊 FAILURE SUMMARY:`);
      console.log('─'.repeat(30));
      Object.entries(failuresByType).forEach(([type, failures]) => {
        console.log(`• ${type.replace('_', ' ')}: ${failures.length}`);
      });
      console.log('==========================');
    }
  }

  private async fetchUserTweets(username: string): Promise<any[]> {
    const query = `from:${username} include:nativeretweets -filter:replies`;
    let allTweets: any[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    
    console.log(`   └── Fetching tweets with query: ${query}`);
    
    try {
      while (pageCount < this.config.maxPagesPerUser!) {
        pageCount++;
        
        // Build URL with cursor if we have one
        let url = `https://api.twitterapi.io/twitter/tweet/advanced_search?queryType=Latest&query=${encodeURIComponent(query)}`;
        if (cursor) {
          url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        
        console.log(`   └── Fetching page ${pageCount}/${this.config.maxPagesPerUser}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': this.config.twitterApiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.tweets || !Array.isArray(data.tweets)) {
          console.log(`   └── Page ${pageCount}: No tweets found or invalid response format`);
          break;
        }

        const tweetsThisPage = data.tweets;
        allTweets.push(...tweetsThisPage);
        
        console.log(`   └── Page ${pageCount}: Found ${tweetsThisPage.length} tweets (total: ${allTweets.length})`);
        
        // Check if we have a cursor for the next page
        cursor = data.cursor;
        if (!cursor || tweetsThisPage.length === 0) {
          console.log(`   └── No more pages available (${cursor ? 'empty page' : 'no cursor'})`);
          break;
        }
        
        // Check if we've hit our tweet limit
        if (allTweets.length >= this.config.maxTweetsPerUser!) {
          console.log(`   └── Reached max tweets limit (${this.config.maxTweetsPerUser})`);
          break;
        }
        
        // Delay between pages (except for the last potential page)
        if (pageCount < this.config.maxPagesPerUser!) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenPages));
        }
      }
      
      // Trim to max tweets if needed
      const finalTweets = allTweets.slice(0, this.config.maxTweetsPerUser);
      console.log(`   └── Collected ${finalTweets.length} tweets across ${pageCount} pages`);
      
      return finalTweets;
    } catch (error) {
      console.error(`   └── API request failed on page ${pageCount}: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }
}

// Main execution function
export async function runTweetCollection(): Promise<void> {
  console.log('⚙️  Loading tweet collection configuration...');
  
  const config: GetTweetsConfig = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    twitterApiKey: process.env.TWITTER_API_KEY || '',
    delayBetweenUsers: parseInt(process.env.USER_DELAY_MS || '1000', 10),
    maxTweetsPerUser: parseInt(process.env.MAX_TWEETS_PER_USER || '100', 10),
    onlyStaleProfiles: process.env.ONLY_STALE_PROFILES === 'true',
    staleHours: parseInt(process.env.STALE_HOURS || '24', 10),
    maxPagesPerUser: parseInt(process.env.MAX_PAGES_PER_USER || '3', 10),
    delayBetweenPages: parseInt(process.env.PAGE_DELAY_MS || '500', 10)
  };

  console.log('📋 Tweet collection configuration:');
  console.log(`   └── MongoDB: ${config.mongoConnectionString}`);
  console.log(`   └── Twitter API Key: ${config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   └── Delay between users: ${config.delayBetweenUsers}ms`);
  console.log(`   └── Max tweets per user: ${config.maxTweetsPerUser}`);
  console.log(`   └── Max pages per user: ${config.maxPagesPerUser}`);
  console.log(`   └── Delay between pages: ${config.delayBetweenPages}ms`);
  console.log(`   └── Only stale profiles: ${config.onlyStaleProfiles}`);
  if (config.onlyStaleProfiles) {
    console.log(`   └── Stale threshold: ${config.staleHours}h`);
  }

  if (!config.twitterApiKey) {
    console.error('❌ TWITTER_API_KEY environment variable is required');
    console.log('💡 Please set your Twitter API key in the .env file');
    throw new Error('TWITTER_API_KEY environment variable is required');
  }

  const collector = new TweetCollector(config);
  
  try {
    await collector.initialize();
    await collector.collectAllTweets();
  } catch (error) {
    console.error('❌ Tweet collection error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await collector.close();
  }
}

// Allow running directly with: bun run actions/getTweets.ts
if (import.meta.main) {
  runTweetCollection().catch(console.error);
}