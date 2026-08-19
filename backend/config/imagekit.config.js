import ImageKit from 'imagekit';
import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT
} from './constants.js';

let imagekitInstance = null;

export const isImageKitConfigured = () => {
  return Boolean(
    IMAGEKIT_PUBLIC_KEY &&
    IMAGEKIT_PRIVATE_KEY &&
    IMAGEKIT_URL_ENDPOINT
  );
};

export const getImageKitInstance = () => {
  if (!isImageKitConfigured()) {
    return null;
  }

  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY,
      privateKey: IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT
    });
  }

  return imagekitInstance;
};

export default getImageKitInstance;
