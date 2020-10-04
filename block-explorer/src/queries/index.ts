export const ENDPOINT =
  process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:8081/graphql`
    : 'https://api.aztec.network/falafel/graphql';
export const POLL_INTERVAL = 1500;
