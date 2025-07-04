import { DatabaseManager } from './lib/database';
import getBatchTwitterProfiles from './lib/twitter/batch-profiles';
import path from 'path';

export interface BatchScraperConfig {
  mongoConnectionString: string;
  twitterApiKey: string;
  userIds: string[];
}

export class BatchProfileScraper {
  private db: DatabaseManager;
  private config: BatchScraperConfig;

  constructor(config: BatchScraperConfig) {
    this.config = config;
    this.db = new DatabaseManager(config.mongoConnectionString);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing batch scraper...');
    console.log(`   └── Twitter API Key: ${this.config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   └── User IDs count: ${this.config.userIds.length}`);
    
    await this.db.connect();
    console.log('🔍 Creating database indexes...');
    await this.db.createIndexes();
    console.log('✅ Batch scraper initialization complete');
  }

  async scrapeBatchProfiles(): Promise<void> {
    console.log('🚀 Starting batch profile scraping...');
    console.log('=====================================');
    
    console.log(`📊 User IDs to process: ${this.config.userIds.length}`);
    console.log(`📋 IDs: ${this.config.userIds.join(', ')}`);
    console.log('=====================================\n');

    let successful = 0;
    let failed = 0;
    const startTime = Date.now();

    try {
      console.log('🔍 Fetching batch profile data...');
      const profiles = await getBatchTwitterProfiles(this.config.userIds, this.config.twitterApiKey);
      
      console.log(`📄 Found ${profiles.length} profiles`);
      console.log('💾 Saving to MongoDB...\n');
		
      console.log(profiles);
      for (const profile of profiles) {
        try {
          console.log(`📋 Processing: @${profile.userName} (${profile.name})`);
          console.log(`   └── Followers: ${profile.followers.toLocaleString()}`);
          console.log(`   └── ID: ${profile.id}`);
          
          // Since we don't have booster numbers for these users, we'll use -1 to indicate they're from batch processing
          await this.db.saveProfileSnapshot(profile, -1, profile.userName);
          successful++;
          
          console.log(`✅ Successfully saved @${profile.userName}\n`);
          
        } catch (error) {
          failed++;
          console.error(`❌ Failed to save @${profile.userName}:`, error instanceof Error ? error.message : error);
        }
      }

    } catch (error) {
      failed = this.config.userIds.length;
      console.error('❌ Batch API request failed:', error instanceof Error ? error.message : error);
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerProfile = totalTime / this.config.userIds.length;

    console.log(`\n🎉 BATCH SCRAPING COMPLETED!`);
    console.log('=============================');
    console.log(`📊 Total requested: ${this.config.userIds.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / this.config.userIds.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`⚡ Average time per profile: ${Math.round(avgTimePerProfile)}ms`);
    console.log('=============================');
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }
}

// Main execution function
export async function runBatchScraper(): Promise<void> {
  console.log('⚙️  Loading batch scraper configuration...');
  
  // The user IDs from the curl command
  const userIds = [
    "1549984440432185345",
    // "1736834221963096064",
    // "1475307122053169152",
    // "1733358836235616256",
    // "1437075480423849984",
    // "1280184148682924032",
    "1894628790841815040"
  ];

  const config: BatchScraperConfig = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    twitterApiKey: process.env.TWITTER_API_KEY || '',
    userIds: userIds
  };

  console.log('📋 Batch configuration loaded:');
  console.log(`   └── MongoDB: ${config.mongoConnectionString}`);
  console.log(`   └── Twitter API Key: ${config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   └── User IDs: ${config.userIds.length} users`);

  if (!config.twitterApiKey) {
    console.error('❌ TWITTER_API_KEY environment variable is required');
    console.log('💡 Please set your Twitter API key in the .env file');
    throw new Error('TWITTER_API_KEY environment variable is required');
  }

  const scraper = new BatchProfileScraper(config);
  
  try {
    await scraper.initialize();
    await scraper.scrapeBatchProfiles();
  } catch (error) {
    console.error('❌ Batch scraper error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await scraper.close();
  }
}

// Allow running directly with: bun run src/batch-scraper.ts
if (import.meta.main) {
  runBatchScraper().catch(console.error);
}
