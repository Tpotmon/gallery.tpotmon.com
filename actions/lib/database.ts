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

export interface ProfileEvent {
  _id?: ObjectId;
  profileId: string;
  username: string;
  eventDate: Date;
  eventType: 'profile_update' | 'booster_change' | 'username_change';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  previousSnapshot?: TwitterProfile;
  newSnapshot: TwitterProfile;
  boosterNumber: number;
}

export class DatabaseManager {
  private client: MongoClient;
  private db: Db;
  private profilesCollection: Collection<ProfileSnapshot>;
  private eventsCollection: Collection<ProfileEvent>;

  constructor(connectionString: string, databaseName: string = 'gottafarmemall') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.profilesCollection = this.db.collection<ProfileSnapshot>('profile_snapshots');
    this.eventsCollection = this.db.collection<ProfileEvent>('profile_events');
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
    // Get the current snapshot to compare changes
    const currentSnapshot = await this.getLatestProfileSnapshot(username);
    
    const snapshot: ProfileSnapshot = {
      profileId: profile.id,
      username: username,
      snapshotDate: new Date(),
      profile: profile,
      boosterNumber: boosterNumber,
    };

    // Detect changes and create events
    if (currentSnapshot) {
      const changes = this.detectProfileChanges(currentSnapshot.profile, profile, currentSnapshot.boosterNumber, boosterNumber);
      
      if (changes.length > 0) {
        // Save event for tracking changes
        const event: ProfileEvent = {
          profileId: profile.id,
          username: username,
          eventDate: new Date(),
          eventType: 'profile_update',
          changes: changes,
          previousSnapshot: currentSnapshot.profile,
          newSnapshot: profile,
          boosterNumber: boosterNumber,
        };
        
        await this.eventsCollection.insertOne(event);
        console.log(`📝 Recorded ${changes.length} changes for @${username}`);
        
        // Log the changes
        for (const change of changes) {
          console.log(`   └── ${change.field}: ${change.oldValue} → ${change.newValue}`);
        }
      } else {
        console.log(`📊 No changes detected for @${username}`);
      }
    }

    // Use replaceOne with upsert to maintain only the latest snapshot per user
    const result = await this.profilesCollection.replaceOne(
      { profileId: profile.id },
      snapshot,
      { upsert: true }
    );
    
    const action = result.upsertedId ? 'Created' : 'Updated';
    console.log(`💾 ${action} profile snapshot for @${username} (ID: ${profile.id})`);
    console.log(`   └── Name: ${profile.name} | Followers: ${profile.followers.toLocaleString()} | Booster #${boosterNumber}`);
    if (result.upsertedId) {
      console.log(`   └── MongoDB _id: ${result.upsertedId}`);
    }
  }

  private detectProfileChanges(
    oldProfile: TwitterProfile,
    newProfile: TwitterProfile,
    oldBoosterNumber: number,
    newBoosterNumber: number
  ): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    // Check each field for changes
    const fieldsToCheck = [
      'name', 'userName', 'description', 'followers', 'following', 'tweets', 'verified', 'location'
    ];
    
    for (const field of fieldsToCheck) {
      if (oldProfile[field as keyof TwitterProfile] !== newProfile[field as keyof TwitterProfile]) {
        changes.push({
          field,
          oldValue: oldProfile[field as keyof TwitterProfile],
          newValue: newProfile[field as keyof TwitterProfile]
        });
      }
    }
    
    // Check booster number
    if (oldBoosterNumber !== newBoosterNumber) {
      changes.push({
        field: 'boosterNumber',
        oldValue: oldBoosterNumber,
        newValue: newBoosterNumber
      });
    }
    
    return changes;
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
    // Profile snapshots indexes
    await this.profilesCollection.createIndex({ username: 1 });
    await this.profilesCollection.createIndex({ profileId: 1 });
    await this.profilesCollection.createIndex({ snapshotDate: -1 });
    await this.profilesCollection.createIndex({ boosterNumber: 1 });
    
    // Profile events indexes
    await this.eventsCollection.createIndex({ profileId: 1 });
    await this.eventsCollection.createIndex({ username: 1 });
    await this.eventsCollection.createIndex({ eventDate: -1 });
    await this.eventsCollection.createIndex({ eventType: 1 });
    await this.eventsCollection.createIndex({ profileId: 1, eventDate: -1 });
    
    console.log('Created database indexes for snapshots and events');
  }

  async getProfileEvents(profileId: string, limit: number = 50): Promise<ProfileEvent[]> {
    return await this.eventsCollection
      .find({ profileId })
      .sort({ eventDate: -1 })
      .limit(limit)
      .toArray();
  }

  async getProfileEventsByUsername(username: string, limit: number = 50): Promise<ProfileEvent[]> {
    return await this.eventsCollection
      .find({ username })
      .sort({ eventDate: -1 })
      .limit(limit)
      .toArray();
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