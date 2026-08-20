export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const menuLimits = {
  maxDishes: 100, // per page
  maxUploadBytes: 10 * 1024 * 1024, // per photo
  maxImageDim: 2048,
  maxPagesPerMenu: 50,
  maxPhotosPerRequest: 20,
};

// Version prefix for R2 image keys. Bump when the image prompt changes.
export const imageCacheVersion = "v1";
