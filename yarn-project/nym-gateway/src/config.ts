export const getConfig = () => {
  return {
    port: process.env.PORT || 8085,
    apiPrefix: process.env.API_PREFIX || '',
    nymHost: process.env.NYM_HOST || '127.0.0.1',
    nymPort: process.env.NYM_PORT || '1977',
  };
};
