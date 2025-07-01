import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Queue for storing failed requests to retry when connection is restored
interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  timestamp: number;
}

class NetworkUtils {
  private static instance: NetworkUtils;
  private isConnected: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private listeners: Set<(isConnected: boolean) => void> = new Set();
  private isProcessingQueue: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 seconds initial delay

  private constructor() {
    // Set up connection monitoring
    this.setupConnectionMonitoring();
    // Load persisted queue from AsyncStorage
    this.loadPersistedQueue();
  }

  public static getInstance(): NetworkUtils {
    if (!NetworkUtils.instance) {
      NetworkUtils.instance = new NetworkUtils();
    }
    return NetworkUtils.instance;
  }

  /**
   * Execute a fetch request with retry logic
   */
  public async fetch<T>(
    url: string,
    options: RequestInit = {},
    retries: number = this.maxRetries,
    retryDelay: number = this.retryDelay,
    queueIfOffline: boolean = true
  ): Promise<T> {
    // Generate a unique ID for this request (for queuing purposes)
    const requestId = `${url}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    if (!this.isConnected && queueIfOffline) {
      console.log(`Network offline, queuing request: ${url}`);
      return new Promise((resolve, reject) => {
        this.addToQueue({
          id: requestId,
          execute: () => this.fetch(url, options, retries, retryDelay, false),
          timestamp: Date.now()
        });
        reject(new Error('Network offline. Request has been queued.'));
      });
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await this.tryParseJson(response);
        const errorMessage = errorData?.message || `Server responded with ${response.status}`;
        
        if (this.isRetryableStatusCode(response.status) && retries > 0) {
          console.log(`Retrying request due to ${response.status} status, ${retries} retries left`);
          
          // Exponential backoff
          const nextRetryDelay = retryDelay * 1.5;
          
          // Wait before retrying
          await this.sleep(retryDelay);
          return this.fetch(url, options, retries - 1, nextRetryDelay, queueIfOffline);
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Network request failed') && retries > 0) {
        // Likely a connection issue, retry
        console.log(`Network error, retrying... ${retries} retries left`);
        await this.sleep(retryDelay);
        return this.fetch(url, options, retries - 1, retryDelay * 1.5, queueIfOffline);
      } else if (queueIfOffline && !this.isConnected && retries === 0) {
        // If we've exhausted retries and we're offline, queue the request
        console.log('Max retries reached while offline, queuing request');
        this.addToQueue({
          id: requestId,
          execute: () => this.fetch(url, options, this.maxRetries, this.retryDelay, false),
          timestamp: Date.now()
        });
      }
      
      throw error;
    }
  }

  /**
   * Add a network listener to be notified of connection changes
   */
  public addNetworkListener(listener: (isConnected: boolean) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify of current status
    listener(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Check if device is online
   */
  public async checkConnection(): Promise<boolean> {
    const netInfoState = await NetInfo.fetch();
    this.isConnected = !!netInfoState.isConnected;
    return this.isConnected;
  }

  // Private helper methods
  private isRetryableStatusCode(statusCode: number): boolean {
    // Retry server errors and some specific client errors
    return (statusCode >= 500 && statusCode < 600) || 
           statusCode === 408 || // Request Timeout
           statusCode === 429;   // Too Many Requests
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async tryParseJson(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  private setupConnectionMonitoring(): void {
    NetInfo.addEventListener(state => {
      const newConnectionStatus = !!state.isConnected;
      
      // Only take action if status has changed
      if (this.isConnected !== newConnectionStatus) {
        this.isConnected = newConnectionStatus;
        
        // Notify all listeners
        this.listeners.forEach(listener => {
          listener(this.isConnected);
        });
        
        if (this.isConnected) {
          console.log('🌐 Connection restored, processing queue');
          this.processQueue();
        } else {
          console.log('🔌 Connection lost');
        }
      }
    });
  }

  private addToQueue(request: QueuedRequest): void {
    this.requestQueue.push(request);
    this.persistQueue();
    
    // Notify user about queued request (can be removed in production)
    if (__DEV__) {
      console.log('Request added to offline queue');
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    console.log(`Processing ${this.requestQueue.length} queued requests`);
    
    // Process queue in FIFO order
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const request of queue) {
      try {
        await request.execute();
        console.log(`Successfully executed queued request ${request.id}`);
      } catch (error) {
        console.error(`Error executing queued request ${request.id}:`, error);
        // Re-queue if recent; otherwise discard old requests
        const isRecent = Date.now() - request.timestamp < 24 * 60 * 60 * 1000; // 24 hours
        if (isRecent) {
          this.requestQueue.push(request);
        }
      }
    }
    
    await this.persistQueue();
    this.isProcessingQueue = false;
  }

  private async persistQueue(): Promise<void> {
    try {
      // Only persist the essential info, not the full functions
      const queueToStore = this.requestQueue.map(item => ({
        id: item.id,
        timestamp: item.timestamp
      }));
      
      await AsyncStorage.setItem('networkRequestQueue', JSON.stringify(queueToStore));
    } catch (error) {
      console.error('Failed to persist network queue:', error);
    }
  }

  private async loadPersistedQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('networkRequestQueue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        console.log(`Found ${queue.length} persisted network requests`);
        // Note: We can't restore the execute functions, so these are just placeholders
        // In a real app, you'd need a way to recreate the requests based on stored metadata
      }
    } catch (error) {
      console.error('Failed to load persisted network queue:', error);
    }
  }
}

export default NetworkUtils.getInstance();
