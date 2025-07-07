import { DatabaseManager } from './lib/database';
import getTwitterProfile from './lib/twitter/profile';

async function addUser(username: string): Promise<void> {
  console.log(`🚀 Adding user: @${username}`);
  
  const config = {
    mongoConnectionString: process.env.MONGODB_CONN || 'mongodb://localhost:27017',
    twitterApiKey: process.env.TWITTER_API_KEY || '',
  };

  if (!config.twitterApiKey) {
    console.error('❌ TWITTER_API_KEY environment variable is required');
    console.log('💡 Please set your Twitter API key in the .env file');
    process.exit(1);
  }

  const db = new DatabaseManager(config.mongoConnectionString);
  
  try {
    console.log('🔧 Initializing database connection...');
    await db.connect();
    await db.createIndexes();
    
    console.log('🔍 Getting highest boosterNumber...');
    const highestBoosterNumber = await db.getHighestBoosterNumber();
    const nextBoosterNumber = highestBoosterNumber + 1;
    console.log(`📊 Next boosterNumber will be: ${nextBoosterNumber}`);
    
    console.log(`📱 Fetching profile for @${username}...`);
    const profile = await getTwitterProfile(username, config.twitterApiKey);
    
    console.log(`💾 Saving profile to database...`);
    await db.saveProfileSnapshot(profile, nextBoosterNumber, username);
    
    console.log(`✅ Successfully added @${username} with boosterNumber ${nextBoosterNumber}`);
    
  } catch (error) {
    console.error('❌ Error adding user:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// CLI argument handling
if (import.meta.main) {
  const username = process.argv[2];
  
  if (!username) {
    console.error('❌ Username is required');
    console.log('💡 Usage: bun actions/addUsers.ts <username>');
    console.log('💡 Example: bun actions/addUsers.ts nyaaier');
    process.exit(1);
  }
  
  addUser(username).catch(console.error);
}