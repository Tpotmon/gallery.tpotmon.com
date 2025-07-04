import { parseBoostersCsv } from './lib/csv-parser';
import { DatabaseManager } from './lib/database';
import getTwitterProfile from './lib/twitter/profile';
import path from 'path';

export interface ScraperConfig {
  mongoConnectionString: string;
  twitterApiKey: string;
  csvFilePath: string;
  delayBetweenRequests?: number;
  batchSize?: number;
}

export class ProfileScraper {
  private db: DatabaseManager;
  private config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = {
      delayBetweenRequests: 1000, // Default 1 second delay
      batchSize: 10, // Default batch size
      ...config
    };
    this.db = new DatabaseManager(config.mongoConnectionString);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing scraper...');
    console.log(`   └── Twitter API Key: ${this.config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   └── CSV File: ${this.config.csvFilePath}`);
    
    await this.db.connect();
    console.log('🔍 Creating database indexes...');
    await this.db.createIndexes();
    console.log('✅ Scraper initialization complete');
  }

  async scrapeAllProfiles(): Promise<void> {
    console.log('🚀 Starting profile scraping...');
    console.log('==================================');
    
    const users = parseBoostersCsv(this.config.csvFilePath);
    console.log(`📊 Found ${users.length} users to process`);
    console.log(`⏰ Delay between requests: ${this.config.delayBetweenRequests}ms`);
    console.log(`🔗 MongoDB: ${this.config.mongoConnectionString}`);
    console.log('==================================\n');

    let successful = 0;
    let failed = 0;
    const failedUsers: Array<{username: string, boosterNumber: number, error: string}> = [];
    const startTime = Date.now();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progressPercent = ((i + 1) / users.length * 100).toFixed(1);
      
      console.log(`\n📋 [${i + 1}/${users.length}] (${progressPercent}%) Processing booster #${user.number}: @${user.username}`);

      try {
        console.log(`🔍 Fetching profile data for @${user.username}...`);
        const profile = await getTwitterProfile(user.username, this.config.twitterApiKey);
        
        console.log(`📄 Profile found: ${profile.name} (${profile.followers} followers)`);
        console.log(`💾 Saving to MongoDB...`);
        
        await this.db.saveProfileSnapshot(profile, user.number, user.username);
        successful++;
        
        console.log(`✅ Successfully scraped @${user.username} -> ${profile.name}`);
        
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedUsers.push({
          username: user.username,
          boosterNumber: user.number,
          error: errorMessage
        });
        console.error(`❌ Failed to scrape @${user.username}:`, errorMessage);
      }

      // Show running statistics
      const successRate = ((successful / (i + 1)) * 100).toFixed(1);
      console.log(`📈 Running stats: ${successful} ✅ | ${failed} ❌ | ${successRate}% success rate`);

      // Add delay between requests to avoid rate limiting
      if (i < users.length - 1 && this.config.delayBetweenRequests) {
        console.log(`⏳ Waiting ${this.config.delayBetweenRequests}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
      }

      // Log milestone progress
      if ((i + 1) % 25 === 0) {
        const elapsedTime = Date.now() - startTime;
        const timePerProfile = elapsedTime / (i + 1);
        const estimatedTimeRemaining = (users.length - (i + 1)) * timePerProfile;
        
        console.log(`\n🎯 MILESTONE: ${i + 1}/${users.length} processed (${progressPercent}%)`);
        console.log(`⏱️  Elapsed: ${Math.round(elapsedTime / 1000)}s | ETA: ${Math.round(estimatedTimeRemaining / 1000)}s`);
        console.log(`📊 Success: ${successful} | Failed: ${failed} | Rate: ${successRate}%`);
        console.log('─'.repeat(50));
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerProfile = totalTime / users.length;

    console.log(`\n🎉 SCRAPING COMPLETED!`);
    console.log('====================');
    console.log(`📊 Total processed: ${users.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / users.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`⚡ Average time per profile: ${Math.round(avgTimePerProfile)}ms`);
    console.log('====================');

    // Display failed users if any
    if (failedUsers.length > 0) {
      console.log(`\n❌ FAILED USERS (${failedUsers.length}):`);
      console.log('============================');
      failedUsers.forEach((failedUser, index) => {
        console.log(`${index + 1}. @${failedUser.username} (Booster #${failedUser.boosterNumber})`);
        console.log(`   └── Error: ${failedUser.error}`);
      });
      console.log('============================');
      console.log('💡 These users may have changed their usernames or made their profiles private.');
    }
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }
}

// Main execution function
export async function runScraper(): Promise<void> {
  console.log('⚙️  Loading configuration...');
  
  const config: ScraperConfig = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    twitterApiKey: process.env.TWITTER_API_KEY || '',
    csvFilePath: path.join(__dirname, 'BOOSTERS.csv'),
    delayBetweenRequests: parseInt(process.env.DELAY_MS || '1000', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '10', 10)
  };

  console.log('📋 Configuration loaded:');
  console.log(`   └── MongoDB: ${config.mongoConnectionString}`);
  console.log(`   └── Twitter API Key: ${config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   └── CSV File: ${config.csvFilePath}`);
  console.log(`   └── Delay: ${config.delayBetweenRequests}ms`);

  if (!config.twitterApiKey) {
    console.error('❌ TWITTER_API_KEY environment variable is required');
    console.log('💡 Please set your Twitter API key in the .env file');
    throw new Error('TWITTER_API_KEY environment variable is required');
  }

  const scraper = new ProfileScraper(config);
  
  try {
    await scraper.initialize();
    await scraper.scrapeAllProfiles();
  } catch (error) {
    console.error('❌ Scraper error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await scraper.close();
  }
}

// Allow running directly with: bun run src/scraper.ts
if (import.meta.main) {
  runScraper().catch(console.error);
}