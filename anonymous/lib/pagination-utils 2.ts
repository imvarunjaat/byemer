import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Helper types for pagination
 */
export interface PaginationState<T> {
  data: T[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  error: Error | null;
}

/**
 * Options for paginated queries
 */
export interface PaginationOptions {
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  initialPage?: number;
}

/**
 * Create a paginated query for Supabase
 * 
 * @param query The Supabase query to paginate
 * @param options Pagination options
 * @returns A function that fetches the next page
 */
export function createPaginatedQuery<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  options: PaginationOptions = {}
) {
  const {
    pageSize = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    initialPage = 0
  } = options;
  
  let currentPage = initialPage;
  let hasMorePages = true;
  
  /**
   * Fetch the next page of data
   */
  const fetchNextPage = async (): Promise<{ data: T[], hasMore: boolean }> => {
    if (!hasMorePages) {
      return { data: [], hasMore: false };
    }
    
    // Calculate range for this page
    const startRange = currentPage * pageSize;
    const endRange = startRange + pageSize - 1;
    
    // Ensure the query is ordered properly
    const paginatedQuery = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(startRange, endRange);
      
    // Execute query
    const { data, error } = await paginatedQuery;
    
    if (error) {
      console.error('Pagination query error:', error);
      throw error;
    }
    
    // Check if we have more pages
    const hasMore = data.length === pageSize;
    hasMorePages = hasMore;
    
    // Increment current page for next fetch
    currentPage++;
    
    return { data: data || [], hasMore };
  };
  
  /**
   * Reset pagination to start from the beginning
   */
  const resetPagination = () => {
    currentPage = initialPage;
    hasMorePages = true;
  };
  
  return { fetchNextPage, resetPagination };
}

/**
 * Create an infinite scroll handler for FlatList
 * 
 * @param loadMore Function to call to load more items
 * @param isLoading Current loading state
 * @param threshold How far from the end to trigger loading (0-1)
 * @returns A function to pass to onEndReached prop of FlatList
 */
export function createInfiniteScrollHandler(
  loadMore: () => Promise<void>,
  isLoading: boolean,
  threshold = 0.2
) {
  let onEndReachedCalledDuringMomentum = false;
  
  return async ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    if (onEndReachedCalledDuringMomentum) return;
    
    if (distanceFromEnd < 0) return;
    
    if (!isLoading) {
      onEndReachedCalledDuringMomentum = true;
      await loadMore();
    }
  };
}

/**
 * Create a pull-to-refresh handler
 * 
 * @param refresh Function to call to refresh data
 * @returns Object with onRefresh function and refreshing state
 */
export function createPullToRefreshHandler(
  refresh: () => Promise<void>
) {
  let refreshing = false;
  
  const onRefresh = async () => {
    if (refreshing) return;
    
    refreshing = true;
    try {
      await refresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      refreshing = false;
    }
  };
  
  return { onRefresh, refreshing };
}
