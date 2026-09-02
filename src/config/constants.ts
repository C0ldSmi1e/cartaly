export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const menuLimits = {
  maxDishes: 100, // per photo
  maxUploadBytes: 10 * 1024 * 1024, // per photo
  maxImageDim: 2048,
  maxPhotosPerMenu: 50,
  maxPhotosPerRequest: 20,
};

// Per IP, fixed one-hour windows. Photos are counted per photo, not per request.
export const rateLimits = {
  photosPerHour: 50,
  imagesPerHour: 100,
  infoPerHour: 200,
  detailsPerHour: 200,
};

// Version prefix for R2 image keys. Bump when the image prompt changes.
export const imageCacheVersion = "v1";

// Stored on details rows. Bump when the detail prompt changes (content, tone);
// stale rows regenerate lazily on their next read.
export const detailVersion = 1;

// Cap on ingredients kept from a generated dish detail.
export const maxDetailIngredients = 10;
