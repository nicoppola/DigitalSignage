import { useState, useCallback, ChangeEvent } from 'react';

interface UseFormInputReturn {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

/**
 * Custom hook for form input management
 * Simplifies controlled input handling with onChange and reset functionality
 */
export const useFormInput = (initialValue: string = ''): UseFormInputReturn => {
  const [value, setValue] = useState<string>(initialValue);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  }, []);

  const reset = useCallback((): void => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    onChange: handleChange,
    reset,
  };
};
