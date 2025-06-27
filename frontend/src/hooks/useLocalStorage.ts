import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: SetValue<T>) => void;
  removeValue: () => void;
  loading: boolean;
  error: string | null;
}

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // 从localStorage读取值
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setError(`读取存储数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return initialValue;
    }
  }, [initialValue, key]);

  // 设置值到localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (typeof window === 'undefined') {
        console.warn('localStorage is not available');
        return;
      }

      try {
        setError(null);
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // 触发自定义事件，通知其他组件
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, newValue: valueToStore },
          })
        );
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
        setError(`保存数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    },
    [key, storedValue]
  );

  // 删除localStorage中的值
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      console.warn('localStorage is not available');
      return;
    }

    try {
      setError(null);
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      
      // 触发自定义事件
      window.dispatchEvent(
        new CustomEvent('local-storage', {
          detail: { key, newValue: null },
        })
      );
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
      setError(`删除数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [key, initialValue]);

  // 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key !== key) {
        return;
      }
      
      if ('detail' in e && e.detail.key !== key) {
        return;
      }

      setStoredValue(readValue());
    };

    // 监听原生storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);
    
    // 监听自定义事件（同标签页）
    window.addEventListener('local-storage', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange as EventListener);
    };
  }, [key, readValue]);

  // 初始化时读取值
  useEffect(() => {
    try {
      setLoading(true);
      setStoredValue(readValue());
    } catch (error) {
      console.warn(`Error initializing localStorage key "${key}":`, error);
      setError(`初始化数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [key, readValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error,
  };
};

// 专门用于存储对象的Hook
export const useLocalStorageObject = <T extends Record<string, any>>(
  key: string,
  initialValue: T
) => {
  const { value, setValue, removeValue, loading, error } = useLocalStorage(key, initialValue);

  const updateField = useCallback(
    (field: keyof T, fieldValue: T[keyof T]) => {
      setValue(prev => ({ ...prev, [field]: fieldValue }));
    },
    [setValue]
  );

  const updateFields = useCallback(
    (updates: Partial<T>) => {
      setValue(prev => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  return {
    value,
    setValue,
    updateField,
    updateFields,
    removeValue,
    loading,
    error,
  };
};
