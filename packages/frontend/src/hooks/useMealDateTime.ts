import { useCallback, useState } from 'react';
import type { DateTimeSource } from '@lifestyle-app/shared';
import { validateNotFuture } from '../lib/dateValidation';
import { fromDatetimeLocal, toLocalISOString } from '../lib/datetime';

export function useMealDateTime() {
  const [recordedAt, setRecordedAt] = useState<string>(toLocalISOString(new Date()));
  const [dateTimeSource, setDateTimeSource] = useState<DateTimeSource>('now');
  const [dateError, setDateError] = useState<string | null>(null);

  const handleDateTimeChange = useCallback((newDateTime: string) => {
    const isoDateTime = fromDatetimeLocal(newDateTime);
    const validationError = validateNotFuture(isoDateTime);
    if (validationError) {
      setDateError(validationError);
      return;
    }
    setDateError(null);
    setRecordedAt(isoDateTime);
    setDateTimeSource('now');
  }, []);

  const validateForSave = useCallback((): boolean => {
    const validationError = validateNotFuture(recordedAt);
    if (validationError) {
      setDateError(validationError);
      return false;
    }
    return true;
  }, [recordedAt]);

  const reset = useCallback(() => {
    setRecordedAt(toLocalISOString(new Date()));
    setDateTimeSource('now');
    setDateError(null);
  }, []);

  return {
    recordedAt,
    setRecordedAt,
    dateTimeSource,
    setDateTimeSource,
    dateError,
    setDateError,
    handleDateTimeChange,
    validateForSave,
    reset,
  };
}
