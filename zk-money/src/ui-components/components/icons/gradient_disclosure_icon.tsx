import { SVGProps } from 'react';

export const GradientDisclosureIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width={12} height={7} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="m1 1 5 5 5-5" stroke="url(#a)" strokeWidth={2} strokeLinejoin="round" />
    <defs>
      <linearGradient id="a" x1={2.035} y1={1.75} x2={6.917} y2={3.672} gradientUnits="userSpaceOnUse">
        <stop stopColor="#940DFF" />
        <stop offset={1} stopColor="#0094FF" />
        <stop offset={1} stopColor="#0094FF" />
      </linearGradient>
    </defs>
  </svg>
);
