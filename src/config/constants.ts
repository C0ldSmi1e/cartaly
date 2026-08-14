export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const menuLimits = {
  maxDishes: 60,
  maxUploadBytes: 10 * 1024 * 1024,
  maxImageDim: 2048,
};

// Version prefix for R2 image keys. Bump when the image prompt changes.
export const imageCacheVersion = "v1";
