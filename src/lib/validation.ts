const BATCH_NO_PATTERN = /^[A-Z0-9-]{4,24}$/;
const CHEMIST_NAME_PATTERN = /^[a-zA-Z0-9\u0900-\u097F .,&'/-]{2,100}$/;
const CITY_PATTERN = /^[a-zA-Z\u0900-\u097F .-]{2,50}$/;

export const validators = {
  batchNo: (batch: string): boolean => {
    if (typeof batch !== 'string') return false;
    return BATCH_NO_PATTERN.test(batch.trim().toUpperCase());
  },

  chemistName: (name: string): boolean => {
    if (typeof name !== 'string') return false;
    return CHEMIST_NAME_PATTERN.test(name.trim());
  },

  city: (city: string): boolean => {
    if (typeof city !== 'string') return false;
    return CITY_PATTERN.test(city.trim());
  },
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
