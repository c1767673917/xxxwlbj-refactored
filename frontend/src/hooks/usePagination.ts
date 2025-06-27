import { useState, useCallback, useMemo } from 'react';

interface PaginationConfig {
  initialPage?: number;
  initialLimit?: number;
  maxLimit?: number;
}

interface PaginationState {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface PaginationActions {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  reset: () => void;
}

interface PaginationInfo {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  startItem: number;
  endItem: number;
  pageNumbers: number[];
}

interface UsePaginationReturn extends PaginationState, PaginationActions, PaginationInfo {}

export const usePagination = (config: PaginationConfig = {}): UsePaginationReturn => {
  const {
    initialPage = 1,
    initialLimit = 10,
    maxLimit = 100,
  } = config;

  const [state, setState] = useState<PaginationState>({
    currentPage: initialPage,
    limit: initialLimit,
    totalItems: 0,
    totalPages: 0,
  });

  // 设置当前页
  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  // 设置每页数量
  const setLimit = useCallback((limit: number) => {
    const newLimit = Math.max(1, Math.min(limit, maxLimit));
    setState(prev => {
      const newTotalPages = Math.ceil(prev.totalItems / newLimit);
      return {
        ...prev,
        limit: newLimit,
        totalPages: newTotalPages,
        currentPage: Math.min(prev.currentPage, newTotalPages || 1),
      };
    });
  }, [maxLimit]);

  // 设置总数
  const setTotal = useCallback((total: number) => {
    setState(prev => {
      const newTotalPages = Math.ceil(total / prev.limit);
      return {
        ...prev,
        totalItems: total,
        totalPages: newTotalPages,
        currentPage: Math.min(prev.currentPage, newTotalPages || 1),
      };
    });
  }, []);

  // 下一页
  const nextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.min(prev.currentPage + 1, prev.totalPages),
    }));
  }, []);

  // 上一页
  const prevPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(prev.currentPage - 1, 1),
    }));
  }, []);

  // 第一页
  const firstPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // 最后一页
  const lastPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: prev.totalPages }));
  }, []);

  // 重置
  const reset = useCallback(() => {
    setState({
      currentPage: initialPage,
      limit: initialLimit,
      totalItems: 0,
      totalPages: 0,
    });
  }, [initialPage, initialLimit]);

  // 计算分页信息
  const paginationInfo = useMemo((): PaginationInfo => {
    const { currentPage, totalPages, totalItems, limit } = state;
    
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;
    
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalItems);
    
    // 生成页码数组（显示当前页前后各2页）
    const pageNumbers: number[] = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    
    // 调整范围以确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return {
      hasNextPage,
      hasPrevPage,
      isFirstPage,
      isLastPage,
      startItem,
      endItem,
      pageNumbers,
    };
  }, [state]);

  return {
    ...state,
    ...paginationInfo,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset,
  };
};
