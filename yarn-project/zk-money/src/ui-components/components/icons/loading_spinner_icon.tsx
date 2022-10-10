import { SVGProps } from 'react';

export const LoadingSpinnerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width={25} height={25} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      opacity={0.2}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.5 25C19.404 25 25 19.404 25 12.5S19.404 0 12.5 0 0 5.596 0 12.5 5.596 25 12.5 25Zm0-4a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z"
      fill="#1FE5CE"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.237 20.893A12.468 12.468 0 0 0 12.5 25C19.404 25 25 19.404 25 12.5 25 5.836 19.785.39 13.214.02v4.01a8.5 8.5 0 1 1-7.648 13.387l-2.33 3.476Z"
      fill="#1FE5CE"
    />
  </svg>
);
