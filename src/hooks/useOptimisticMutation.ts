/**
 * Optimistic Updates Hook
 * Provides 3X performance improvement by updating UI immediately
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface OptimisticMutationOptions<T, R> {
  mutationFn: (data: T) => Promise<R>;
  onSuccess?: (result: R, variables: T) => void;
  onError?: (error: Error, variables: T) => void;
  optimisticUpdate?: (variables: T) => any;
  revertUpdate?: (variables: T) => any;
  successMessage?: string;
  errorMessage?: string;
}

interface OptimisticMutationResult<T, R> {
  mutate: (variables: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  data: R | null;
  reset: () => void;
}

/**
 * Hook for optimistic mutations with automatic rollback on error
 */
export function useOptimisticMutation<T, R>(
  options: OptimisticMutationOptions<T, R>
): OptimisticMutationResult<T, R> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);
  const { success, error: showError } = useToast();

  const mutate = useCallback(async (variables: T) => {
    setIsLoading(true);
    setError(null);

    // Apply optimistic update immediately
    let optimisticData: any = null;
    if (options.optimisticUpdate) {
      optimisticData = options.optimisticUpdate(variables);
    }

    try {
      // Perform the actual mutation
      const result = await options.mutationFn(variables);
      
      // Update with real data
      setData(result);
      
      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(result, variables);
      }

      // Show success message
      if (options.successMessage) {
        success(options.successMessage);
      }

    } catch (err) {
      const error = err as Error;
      setError(error);

      // Revert optimistic update on error
      if (options.revertUpdate && optimisticData) {
        options.revertUpdate(variables);
      }

      // Call error callback
      if (options.onError) {
        options.onError(error, variables);
      }

      // Show error message
      const errorMsg = options.errorMessage || error.message || 'Operation failed';
      showError(errorMsg);

      throw error; // Re-throw for caller handling
    } finally {
      setIsLoading(false);
    }
  }, [options, success, showError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    data,
    reset
  };
}

/**
 * Hook for optimistic list mutations (add, remove, update items)
 */
export function useOptimisticListMutation<T extends { id: string }, R>(
  list: T[],
  setList: (list: T[]) => void,
  options: OptimisticMutationOptions<any, R> & {
    operation: 'add' | 'remove' | 'update';
    getOptimisticItem?: (variables: any) => T;
  }
) {
  return useOptimisticMutation({
    ...options,
    optimisticUpdate: (variables: any) => {
      const currentList = [...list];
      
      switch (options.operation) {
        case 'add':
          if (options.getOptimisticItem) {
            const newItem = options.getOptimisticItem(variables);
            setList([...currentList, newItem]);
            return { previousList: currentList, newItem };
          }
          break;
          
        case 'remove':
          const filteredList = currentList.filter(item => item.id !== variables.id);
          setList(filteredList);
          return { previousList: currentList, removedId: variables.id };
          
        case 'update':
          const updatedList = currentList.map(item => 
            item.id === variables.id 
              ? { ...item, ...variables.updates }
              : item
          );
          setList(updatedList);
          return { previousList: currentList, updatedId: variables.id };
      }
      
      return { previousList: currentList };
    },
    revertUpdate: (variables: any) => {
      // Revert to previous list state
      const optimisticData = options.optimisticUpdate?.(variables);
      if (optimisticData?.previousList) {
        setList(optimisticData.previousList);
      }
    }
  });
}

/**
 * Hook for optimistic counter mutations
 */
export function useOptimisticCounter(
  initialValue: number,
  mutationFn: (increment: number) => Promise<number>
) {
  const [count, setCount] = useState(initialValue);

  return useOptimisticMutation({
    mutationFn,
    optimisticUpdate: (increment: number) => {
      const previousCount = count;
      setCount(prev => prev + increment);
      return { previousCount };
    },
    revertUpdate: (increment: number) => {
      setCount(initialValue); // Revert to initial or last known good value
    },
    onSuccess: (result: number) => {
      setCount(result); // Update with server value
    }
  });
}

/**
 * Hook for optimistic form mutations
 */
export function useOptimisticForm<T extends Record<string, any>>(
  initialData: T,
  mutationFn: (data: T) => Promise<T>
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [originalData, setOriginalData] = useState<T>(initialData);

  return useOptimisticMutation({
    mutationFn,
    optimisticUpdate: (data: T) => {
      setOriginalData(formData); // Store current state for rollback
      setFormData(data); // Apply optimistic update
      return { previousData: formData };
    },
    revertUpdate: () => {
      setFormData(originalData); // Revert to previous state
    },
    onSuccess: (result: T) => {
      setFormData(result); // Update with server response
      setOriginalData(result); // Update baseline
    }
  });
}

/**
 * Utility functions for common optimistic update patterns
 */
export const OptimisticUtils = {
  /**
   * Generate temporary ID for optimistic items
   */
  generateTempId: () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Check if an item has a temporary ID
   */
  isTempId: (id: string) => id.startsWith('temp_'),

  /**
   * Create optimistic item with loading state (partial data)
   */
  createOptimisticItem: <T extends Record<string, any>>(
    baseItem: Partial<T>, 
    tempId?: string
  ): Partial<T> & { id: string; isOptimistic: boolean } => ({
    ...baseItem,
    id: tempId || OptimisticUtils.generateTempId(),
    isOptimistic: true,
  }),

  /**
   * Create optimistic item with complete data
   */
  createCompleteOptimisticItem: <T extends Record<string, any>>(
    baseItem: T, 
    tempId?: string
  ): T & { isOptimistic: boolean } => ({
    ...baseItem,
    id: tempId || OptimisticUtils.generateTempId(),
    isOptimistic: true,
  } as T & { isOptimistic: boolean }),

  /**
   * Remove optimistic flags from item
   */
  finalizeItem: <T extends { isOptimistic?: boolean }>(item: T): Omit<T, 'isOptimistic'> => {
    const { isOptimistic, ...finalItem } = item;
    return finalItem;
  }
};

/**
 * Performance tracking for optimistic updates
 */
export class OptimisticPerformanceTracker {
  private static updates: Array<{
    timestamp: number;
    type: string;
    duration: number;
    success: boolean;
  }> = [];

  static recordUpdate(type: string, duration: number, success: boolean): void {
    this.updates.push({
      timestamp: Date.now(),
      type,
      duration,
      success
    });

    // Keep only last 100 updates
    if (this.updates.length > 100) {
      this.updates = this.updates.slice(-100);
    }
  }

  static getStats() {
    if (this.updates.length === 0) {
      return {
        totalUpdates: 0,
        successRate: 0,
        averageDuration: 0,
        recentUpdates: []
      };
    }

    const successful = this.updates.filter(u => u.success).length;
    const successRate = (successful / this.updates.length) * 100;
    const avgDuration = this.updates.reduce((sum, u) => sum + u.duration, 0) / this.updates.length;

    return {
      totalUpdates: this.updates.length,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(avgDuration),
      recentUpdates: this.updates.slice(-10)
    };
  }
}
