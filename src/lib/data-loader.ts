// Utility to fetch mock data from JSON files
export async function loadMockData<T>(fileName: string): Promise<T[]> {
  try {
    // In Next.js (App Router), dynamic imports can work for JSON in server components/routes
    // For client components, use fetch or structure differently.
    // This approach assumes the JSON files are accessible relative to the server process.
    // For a more robust solution, especially for client-side usage,
    // place JSON in /public and fetch, or create an API route.

    // This dynamic import might not work reliably across all environments (client/server)
    // without proper configuration or using fetch.
    // const dataModule = await import(`@/data/${fileName}.json`);
    // return dataModule.default || [];

    // Using fetch as a more universal approach (assuming files are in /public)
     const response = await fetch(`/data/${fileName}.json`);
     if (!response.ok) {
       throw new Error(`Failed to fetch ${fileName}.json: ${response.statusText}`);
     }
     const data = await response.json();
     return data || [];

  } catch (error) {
    console.error(`Error loading mock data from ${fileName}.json:`, error);
    return []; // Return empty array on error
  }
}
