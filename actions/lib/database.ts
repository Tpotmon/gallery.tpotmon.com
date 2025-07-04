import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { TwitterProfile } from './twitter/types';

export interface ProfileSnapshot {
  _id?: ObjectId;
  profileId: string;
  username: string;
  snapshotDate: Date;
  profile: TwitterProfile;
  boosterNumber: number;
}

export class DatabaseManager {
  private client: MongoClient;
  private db: Db;
  private profilesCollection: Collection<ProfileSnapshot>;

  constructor(connectionString: string, databaseName: string = 'gottafarmemall') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.profilesCollection = this.db.collection<ProfileSnapshot>('profile_snapshots');
  }

  async connect(): Promise<void> {
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log(`   └── Connection string: ${this.client.options.hosts?.[0]?.host || 'localhost'}:${this.client.options.hosts?.[0]?.port || 27017}`);
    
    try {
      await this.client.connect();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  async saveProfileSnapshot(
    profile: TwitterProfile,
    boosterNumber: number,
    username: string
  ): Promise<void> {
    const snapshot: ProfileSnapshot = {
      profileId: profile.id,
      username: username,
      snapshotDate: new Date(),
      profile: profile,
      boosterNumber: boosterNumber,
    };

    // Let MongoDB generate unique _id automatically for append-only behavior
    const result = await this.profilesCollection.insertOne(snapshot);
    console.log(`💾 Saved profile snapshot for @${username} (ID: ${profile.id})`);
    console.log(`   └── Name: ${profile.name} | Followers: ${profile.followers.toLocaleString()} | Booster #${boosterNumber}`);
    console.log(`   └── MongoDB _id: ${result.insertedId}`);
  }

  async getLatestProfileSnapshot(username: string): Promise<ProfileSnapshot | null> {
    return await this.profilesCollection
      .findOne(
        { username: username },
        { sort: { snapshotDate: -1 } }
      );
  }

  async getAllProfileSnapshots(username: string): Promise<ProfileSnapshot[]> {
    return await this.profilesCollection
      .find({ username: username })
      .sort({ snapshotDate: -1 })
      .toArray();
  }

  async createIndexes(): Promise<void> {
    await this.profilesCollection.createIndex({ username: 1 });
    await this.profilesCollection.createIndex({ profileId: 1 });
    await this.profilesCollection.createIndex({ snapshotDate: -1 });
    await this.profilesCollection.createIndex({ boosterNumber: 1 });
    console.log('Created database indexes');
  }

  async getAllUniqueProfileIds(): Promise<string[]> {
    const result = await this.profilesCollection.distinct('profileId');
    return result.filter(id => id && typeof id === 'string');
  }

  async getProfileIdsInBatches(batchSize: number = 10): Promise<string[][]> {
    const allIds = await this.getAllUniqueProfileIds();
    const batches: string[][] = [];
    
    for (let i = 0; i < allIds.length; i += batchSize) {
      batches.push(allIds.slice(i, i + batchSize));
    }
    
    return batches;
  }

  async getLastUpdatedDate(profileId: string): Promise<Date | null> {
    const latest = await this.profilesCollection
      .findOne(
        { profileId: profileId },
        { sort: { snapshotDate: -1 } }
      );
    return latest?.snapshotDate || null;
  }

  async getStaleProfileIds(olderThanHours: number = 24): Promise<string[]> {
    const cutoffDate = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    // Get all profile IDs that haven't been updated in the specified time
    const pipeline = [
      {
        $group: {
          _id: '$profileId',
          lastUpdate: { $max: '$snapshotDate' }
        }
      },
      {
        $match: {
          lastUpdate: { $lt: cutoffDate }
        }
      },
      {
        $project: {
          _id: 1
        }
      }
    ];

    const result = await this.profilesCollection.aggregate(pipeline).toArray();
    return result.map(doc => doc._id).filter(id => id && typeof id === 'string');
  }
}