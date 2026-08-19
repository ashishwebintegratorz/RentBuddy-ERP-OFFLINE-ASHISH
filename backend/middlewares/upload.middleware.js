import multer from 'multer';

// Use memory storage for direct streaming to ImageKit CDN
const storage = multer.memoryStorage();

// File filter for images and documents
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, HEIC, PDF.`), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max file size
  },
  fileFilter
});

export const uploadSingle = (fieldName = 'file') => upload.single(fieldName);
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => upload.array(fieldName, maxCount);
export const uploadKycFields = upload.fields([
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 },
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'vehicleRc', maxCount: 1 },
  { name: 'selfiePhoto', maxCount: 1 }
]);
