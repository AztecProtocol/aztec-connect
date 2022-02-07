import { SVGProps } from 'react';

export const DoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width={25} height={25} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx={12.5} cy={12.5} r={12.5} fill="#1FE5CE" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.808 8.635a1.5 1.5 0 0 0-2.122 0L10.721 13.6l-1.539-1.54a1.5 1.5 0 1 0-2.121 2.122l2.483 2.484a1.5 1.5 0 0 0 1.677.307c.287-.054.561-.192.784-.414l5.803-5.803a1.5 1.5 0 0 0 0-2.121Z"
      fill="#fff"
    />
  </svg>
);
