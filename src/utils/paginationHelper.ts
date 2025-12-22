/**
 * Pagination Helper Utility
 * 
 * Handles Supabase's 1000-row limit by automatically paginating through all results.
 * This utility can be reused across all services and pages to ensure complete data fetching.
 */

/**
 * Fetches all rows from a Supabase query by automatically paginating through results.
 * 
 * @param queryFn - A function that takes `from` and `to` parameters and returns a Promise with `{ data, error }`
 * @returns Promise resolving to an array of all fetched rows
 * 
 * @example
 * ```typescript
 * const allData = await fetchAllRows(async (from, to) => {
 *   return await supabase
 *     .from('students')
 *     .select('*')
 *     .eq('school_id', schoolId)
 *     .range(from, to);
 * });
 * ```
 */
export const fetchAllRows = async <T,>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> => {
  const allResults: T[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  let consecutiveEmptyPages = 0;
  const maxEmptyPages = 2; // Safety check to prevent infinite loops

  while (hasMore && consecutiveEmptyPages < maxEmptyPages) {
    const { data, error } = await queryFn(from, from + pageSize - 1);
    if (error) {
      console.error('Error in fetchAllRows:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allResults.push(...data);
      from += pageSize;
      // Continue if we got a full page (might be more data)
      hasMore = data.length === pageSize;
      consecutiveEmptyPages = 0; // Reset counter on successful fetch
    } else {
      // No data returned - check if we should continue
      // If we've fetched some data before, this might be the end
      // If this is the first page and it's empty, there's no data
      if (allResults.length > 0 || from === 0) {
        hasMore = false;
      } else {
        consecutiveEmptyPages++;
      }
    }
  }

  return allResults;
};
