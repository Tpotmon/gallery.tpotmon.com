import { DatabaseManager } from './lib/database';

export interface CollapseConfig {
  mongoConnectionString: string;
  dryRun?: boolean;
}

export class ProfileCollapser {
  private db: DatabaseManager;
  private config: CollapseConfig;

  constructor(config: CollapseConfig) {
    this.config = {
      dryRun: false,
      ...config
    };
    this.db = new DatabaseManager(config.mongoConnectionString);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing profile collapser...');
    console.log(`   └── Dry run: ${this.config.dryRun ? 'YES' : 'NO'}`);
    
    await this.db.connect();
    console.log('✅ Profile collapser initialization complete');
  }

  async collapseProfiles(): Promise<void> {
    console.log('🚀 Starting profile collapse operation...');
    console.log('=========================================');
    
    // Get all profile IDs with their counts
    const duplicateStats = await this.getDuplicateStats();
    
    if (duplicateStats.totalDuplicates === 0) {
      console.log('📊 No duplicate profiles found - collection is already clean!');
      return;
    }

    console.log(`📊 Found ${duplicateStats.profilesWithDuplicates} profiles with duplicates`);
    console.log(`📊 Total duplicate records to remove: ${duplicateStats.totalDuplicates}`);
    console.log(`📊 Records that will remain: ${duplicateStats.totalProfiles - duplicateStats.totalDuplicates}`);

    if (this.config.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      await this.showDuplicateDetails();
      return;
    }

    console.log('⚠️  PROCEEDING WITH ACTUAL DELETION...');
    console.log('=========================================\n');

    let totalDeleted = 0;
    let processedProfiles = 0;

    // Process each profile ID
    for (const profileId of duplicateStats.profileIds) {
      const deleted = await this.collapseProfileId(profileId);
      totalDeleted += deleted;
      processedProfiles++;

      if (deleted > 0) {
        const progress = ((processedProfiles / duplicateStats.profileIds.length) * 100).toFixed(1);
        console.log(`📈 Progress: ${processedProfiles}/${duplicateStats.profileIds.length} profiles (${progress}%)`);
      }
    }

    console.log(`\n🎉 PROFILE COLLAPSE COMPLETED!`);
    console.log('===============================');
    console.log(`🗑️  Total records deleted: ${totalDeleted}`);
    console.log(`📊 Profiles processed: ${processedProfiles}`);
    console.log(`✅ Collection now has one record per profile.id`);
    console.log('===============================');
  }

  private async getDuplicateStats(): Promise<{
    profileIds: string[];
    totalProfiles: number;
    profilesWithDuplicates: number;
    totalDuplicates: number;
  }> {
    const pipeline = [
      {
        $group: {
          _id: '$profileId',
          count: { $sum: 1 },
          latestDate: { $max: '$snapshotDate' }
        }
      },
      {
        $project: {
          profileId: '$_id',
          count: 1,
          latestDate: 1,
          duplicates: { $subtract: ['$count', 1] }
        }
      }
    ];

    const results = await this.db['profilesCollection'].aggregate(pipeline).toArray();
    
    const profileIds = results.map(r => r.profileId).filter(id => id && typeof id === 'string');
    const totalProfiles = results.reduce((sum, r) => sum + r.count, 0);
    const profilesWithDuplicates = results.filter(r => r.count > 1).length;
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);

    return {
      profileIds,
      totalProfiles,
      profilesWithDuplicates,
      totalDuplicates
    };
  }

  private async showDuplicateDetails(): Promise<void> {
    const pipeline = [
      {
        $group: {
          _id: '$profileId',
          count: { $sum: 1 },
          usernames: { $addToSet: '$username' },
          latestDate: { $max: '$snapshotDate' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: {
          count: -1
        }
      },
      {
        $limit: 10
      }
    ];

    const duplicates = await this.db['profilesCollection'].aggregate(pipeline).toArray();
    
    console.log('\n📋 Top 10 profiles with most duplicates:');
    console.log('========================================');
    
    for (const dup of duplicates) {
      console.log(`🔍 Profile ID: ${dup._id}`);
      console.log(`   └── Usernames: ${dup.usernames.join(', ')}`);
      console.log(`   └── Duplicate count: ${dup.count}`);
      console.log(`   └── Latest snapshot: ${dup.latestDate.toISOString()}`);
      console.log('');
    }
  }

  private async collapseProfileId(profileId: string): Promise<number> {
    // Find the most recent snapshot for this profile ID
    const latestSnapshot = await this.db['profilesCollection']
      .findOne(
        { profileId: profileId },
        { sort: { snapshotDate: -1 } }
      );

    if (!latestSnapshot) {
      console.log(`⚠️  No snapshots found for profile ID: ${profileId}`);
      return 0;
    }

    // Delete all older snapshots for this profile ID
    const deleteResult = await this.db['profilesCollection'].deleteMany({
      profileId: profileId,
      _id: { $ne: latestSnapshot._id }
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️  Profile ID ${profileId}: kept latest snapshot, deleted ${deleteResult.deletedCount} older records`);
      console.log(`   └── Kept: @${latestSnapshot.username} (${latestSnapshot.snapshotDate.toISOString()})`);
    }

    return deleteResult.deletedCount;
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }
}

// Main execution function
export async function runProfileCollapse(): Promise<void> {
  console.log('⚙️  Loading profile collapse configuration...');
  
  const config: CollapseConfig = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    dryRun: process.env.DRY_RUN === 'true'
  };

  console.log('📋 Profile collapse configuration:');
  console.log(`   └── MongoDB: ${config.mongoConnectionString}`);
  console.log(`   └── Dry run: ${config.dryRun ? 'YES' : 'NO'}`);

  const collapser = new ProfileCollapser(config);
  
  try {
    await collapser.initialize();
    await collapser.collapseProfiles();
  } catch (error) {
    console.error('❌ Profile collapse error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await collapser.close();
  }
}

// Allow running directly with: bun run actions/collapseProfiles.ts
if (import.meta.main) {
  runProfileCollapse().catch(console.error);
}