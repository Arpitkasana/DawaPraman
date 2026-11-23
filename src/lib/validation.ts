export const validators = {
  batchNo: (batch: string) =>
    /^[A-Z0-9-]{4,20}$/.test(batch.trim().toUpperCase()),
  chemistName: (name: string) =>
    /^[a-zA-Z0-9 .,-]{2,100}$/.test(name.trim()),
  city: (city: string) =>
    /^[a-zA-Z ]{2,50}$/.test(city.trim()),
};

export const sanitizeInput = (input: string) => {
  return input.replace(/[<>]/g, '').trim();
};
