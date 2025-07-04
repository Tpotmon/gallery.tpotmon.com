import { runScraper } from './src/scraper';

console.log("🌱 GottaFarmEmAll - Twitter Profile Scraper");
console.log("==========================================");

try {
  await runScraper();
} catch (error) {
  console.error("❌ Scraper failed:", error);
  process.exit(1);
}