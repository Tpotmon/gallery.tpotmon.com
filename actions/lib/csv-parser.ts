import { readFileSync } from 'fs';

export interface BoosterUser {
  number: number;
  username: string;
}

export function parseBoostersCsv(filePath: string): BoosterUser[] {
  const fileContent = readFileSync(filePath, 'utf-8');
  const lines = fileContent.trim().split('\n');
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const [numberStr, username] = line.split(',');
    return {
      number: parseInt(numberStr, 10),
      username: username.trim()
    };
  });
}