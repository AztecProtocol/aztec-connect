export const sdkVersion = (process.env.NODE_ENV === 'production' && process.env.COMMIT_TAG) || '';
