
// This file is no longer needed as mock data functionality is removed.
// You can delete this file.
// Utility to fetch mock data from JSON files
// export async function loadMockData<T>(fileName: string): Promise<T[]> {
//   try {
//     const response = await fetch(`/data/${fileName}.json`);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch ${fileName}.json: ${response.statusText}`);
//     }
//     const data = await response.json();
//     return data || [];
//   } catch (error) {
//     console.error(`Error loading mock data from ${fileName}.json:`, error);
//     return []; // Return empty array on error
//   }
// }
