import { DatabaseManager } from './lib/database';
import getBatchTwitterProfiles from './lib/twitter/batch-profiles';

export interface GetUserDataConfig {
  mongoConnectionString: string;
  twitterApiKey: string;
  batchSize?: number;
  delayBetweenBatches?: number;
  onlyStaleProfiles?: boolean;
  staleHours?: number;
}

export interface FailureRecord {
  profileId: string;
  username?: string;
  reason: string;
  error?: string;
  failureType: 'save_error' | 'api_missing' | 'batch_error';
}

export class UserDataUpdater {
  private db: DatabaseManager;
  private config: GetUserDataConfig;
  private failureRecords: FailureRecord[] = [];

  constructor(config: GetUserDataConfig) {
    this.config = {
      batchSize: 10,
      delayBetweenBatches: 2000, // 2 seconds between batches
      onlyStaleProfiles: true,
      staleHours: 24,
      ...config
    };
    this.db = new DatabaseManager(config.mongoConnectionString);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing user data updater...');
    console.log(`   └── Batch size: ${this.config.batchSize}`);
    console.log(`   └── Only stale profiles: ${this.config.onlyStaleProfiles}`);
    if (this.config.onlyStaleProfiles) {
      console.log(`   └── Stale threshold: ${this.config.staleHours} hours`);
    }
    
    await this.db.connect();
    await this.db.createIndexes();
    console.log('✅ User data updater initialization complete');
  }

  async updateAllUsers(): Promise<void> {
    console.log('🚀 Starting user data update...');
    console.log('===============================');
    
    // Get profile IDs to update
    const profileIds = this.config.onlyStaleProfiles 
      ? await this.db.getStaleProfileIds(this.config.staleHours)
      : await this.db.getAllUniqueProfileIds();

    if (profileIds.length === 0) {
      console.log('📊 No profiles need updating at this time');
      return;
    }

    console.log(`📊 Found ${profileIds.length} profiles to update`);
    
    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < profileIds.length; i += this.config.batchSize!) {
      batches.push(profileIds.slice(i, i + this.config.batchSize!));
    }

    console.log(`📦 Split into ${batches.length} batches of ${this.config.batchSize}`);
    console.log('===============================\n');

    let totalUpdated = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchProgress = `[${batchIndex + 1}/${batches.length}]`;
      
      console.log(`📦 ${batchProgress} Processing batch with ${batch.length} users`);
      console.log(`   └── IDs: ${batch.join(', ')}`);

      try {
        console.log('🔍 Fetching batch profile data...');
        const profiles = await getBatchTwitterProfiles(batch, this.config.twitterApiKey);
        
        console.log(`📄 Received ${profiles.length} profiles from API`);

        for (const profile of profiles) {
          try {
            console.log(`💾 Updating @${profile.userName} (${profile.name})`);
            
            // Find the booster number from existing data
            const existingProfile = await this.db.getLatestProfileSnapshot(profile.userName);
            const boosterNumber = existingProfile?.boosterNumber ?? -1;
            
            await this.db.saveProfileSnapshot(profile, boosterNumber, profile.userName);
            totalUpdated++;
            
          } catch (saveError) {
            totalFailed++;
            const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
            console.error(`❌ Failed to save @${profile.userName}:`, errorMessage);
            
            this.failureRecords.push({
              profileId: profile.id,
              username: profile.userName,
              reason: `Database save error: ${errorMessage}`,
              error: errorMessage,
              failureType: 'save_error'
            });
          }
        }

        // Handle profiles that weren't returned by the API
        if (profiles.length < batch.length) {
          const returnedIds = profiles.map(p => p.id);
          const missingIds = batch.filter(id => !returnedIds.includes(id));
          console.log(`⚠️  ${missingIds.length} profiles not returned by API: ${missingIds.join(', ')}`);
          
          // Try to get username from existing data for better failure reporting
          for (const missingId of missingIds) {
            const existingProfile = await this.db.getLatestProfileSnapshot(missingId);
            const username = existingProfile?.username || 'unknown';
            
            this.failureRecords.push({
              profileId: missingId,
              username: username,
              reason: 'Profile not returned by Twitter API - possibly deleted, suspended, or private',
              failureType: 'api_missing'
            });
          }
          
          totalFailed += missingIds.length;
        }

        console.log(`✅ Batch ${batchProgress} completed: ${profiles.length} updated`);

      } catch (batchError) {
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        console.error(`❌ Batch ${batchProgress} failed:`, errorMessage);
        
        // Add all profiles in this batch as failures
        for (const profileId of batch) {
          const existingProfile = await this.db.getLatestProfileSnapshot(profileId);
          const username = existingProfile?.username || 'unknown';
          
          this.failureRecords.push({
            profileId: profileId,
            username: username,
            reason: `Batch processing failed: ${errorMessage}`,
            error: errorMessage,
            failureType: 'batch_error'
          });
        }
        
        totalFailed += batch.length;
      }

      // Progress report
      const processedSoFar = (batchIndex + 1) * this.config.batchSize!;
      const progressPercent = ((batchIndex + 1) / batches.length * 100).toFixed(1);
      console.log(`📈 Progress: ${Math.min(processedSoFar, profileIds.length)}/${profileIds.length} (${progressPercent}%)`);

      // Delay between batches (except for the last one)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenBatches}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      } else {
        console.log('');
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerProfile = totalTime / profileIds.length;

    console.log(`🎉 USER DATA UPDATE COMPLETED!`);
    console.log('==============================');
    console.log(`📊 Total profiles: ${profileIds.length}`);
    console.log(`✅ Successfully updated: ${totalUpdated}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📈 Success rate: ${((totalUpdated / profileIds.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`⚡ Average time per profile: ${Math.round(avgTimePerProfile)}ms`);
    console.log(`📦 Batches processed: ${batches.length}`);
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
      }, {} as Record<string, FailureRecord[]>);

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

  async close(): Promise<void> {
    await this.db.disconnect();
  }
}

// Main execution function
export async function runUserDataUpdate(): Promise<void> {
  console.log('⚙️  Loading user data update configuration...');
  
  const config: GetUserDataConfig = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    twitterApiKey: process.env.TWITTER_API_KEY || '',
    batchSize: parseInt(process.env.BATCH_SIZE || '10', 10),
    delayBetweenBatches: parseInt(process.env.BATCH_DELAY_MS || '2000', 10),
    onlyStaleProfiles: process.env.ONLY_STALE !== 'false', // Default true
    staleHours: parseInt(process.env.STALE_HOURS || '24', 10)
  };

  console.log('📋 User data update configuration:');
  console.log(`   └── MongoDB: ${config.mongoConnectionString}`);
  console.log(`   └── Twitter API Key: ${config.twitterApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   └── Batch size: ${config.batchSize}`);
  console.log(`   └── Batch delay: ${config.delayBetweenBatches}ms`);
  console.log(`   └── Only stale profiles: ${config.onlyStaleProfiles}`);
  if (config.onlyStaleProfiles) {
    console.log(`   └── Stale threshold: ${config.staleHours}h`);
  }

  if (!config.twitterApiKey) {
    console.error('❌ TWITTER_API_KEY environment variable is required');
    console.log('💡 Please set your Twitter API key in the .env file');
    throw new Error('TWITTER_API_KEY environment variable is required');
  }

  const updater = new UserDataUpdater(config);
  
  try {
    await updater.initialize();
    await updater.updateAllUsers();
  } catch (error) {
    console.error('❌ User data update error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await updater.close();
  }
}

// Allow running directly with: bun run src/actions/getUserData.ts
if (import.meta.main) {
  runUserDataUpdate().catch(console.error);
}
