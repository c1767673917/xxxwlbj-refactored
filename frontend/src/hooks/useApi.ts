import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
}

export const useApi = <T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  _immediate = false
): UseApiReturn<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: _immediate,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const result = await apiFunction(...args);
        setState(prev => ({ ...prev, data: result, loading: false }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '请求失败';
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
};

// 专门用于分页API的Hook
export const usePaginatedApi = <T = any>(
  apiFunction: (page: number, ...args: any[]) => Promise<{ items: T[]; total: number; page: number; limit: number }>,
  initialPage = 1,
  _immediate = false
) => {
  const [pagination, setPagination] = useState({
    currentPage: initialPage,
    totalPages: 0,
    totalItems: 0,
    limit: 10,
  });

  const { data, loading, error, execute, reset, setError } = useApi(apiFunction, false);

  const loadPage = useCallback(
    async (page: number, ...args: any[]) => {
      try {
        const result = await execute(page, ...args);
        setPagination({
          currentPage: result.page,
          totalPages: Math.ceil(result.total / result.limit),
          totalItems: result.total,
          limit: result.limit,
        });
        return result;
      } catch (error) {
        throw error;
      }
    },
    [execute]
  );

  const nextPage = useCallback(
    (...args: any[]) => {
      if (pagination.currentPage < pagination.totalPages) {
        return loadPage(pagination.currentPage + 1, ...args);
      }
    },
    [pagination.currentPage, pagination.totalPages, loadPage]
  );

  const prevPage = useCallback(
    (...args: any[]) => {
      if (pagination.currentPage > 1) {
        return loadPage(pagination.currentPage - 1, ...args);
      }
    },
    [pagination.currentPage, loadPage]
  );

  const goToPage = useCallback(
    (page: number, ...args: any[]) => {
      if (page >= 1 && page <= pagination.totalPages) {
        return loadPage(page, ...args);
      }
    },
    [pagination.totalPages, loadPage]
  );

  const resetPagination = useCallback(() => {
    setPagination({
      currentPage: initialPage,
      totalPages: 0,
      totalItems: 0,
      limit: 10,
    });
    reset();
  }, [initialPage, reset]);

  return {
    data,
    loading,
    error,
    pagination,
    loadPage,
    nextPage,
    prevPage,
    goToPage,
    reset: resetPagination,
    setError,
  };
};
