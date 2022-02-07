import { SVGProps } from 'react';
// import { useUniqueId } from '../../util';

export const DoneGradientIcon = (props: SVGProps<SVGSVGElement>) => {
  // const id = useUniqueId();
  // TODO: use unique id once hooks are functional
  const id = 'done-gradient-icon';
  return (
    <svg width={30} height={30} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 30c8.284 0 15-6.716 15-15 0-8.284-6.716-15-15-15C6.716 0 0 6.716 0 15c0 8.284 6.716 15 15 15Zm-3.006-10.3c.24.195.538.3.846.3l-.002-.003c.2 0 .398-.043.58-.128l.01-.005c.163-.071.312-.172.438-.298l6.408-6.388a1.43 1.43 0 0 0-1.009-2.464 1.44 1.44 0 0 0-1.02.439l-5.386 5.37-1.864-1.86a1.341 1.341 0 0 0-1.897 0l-.134.134a1.337 1.337 0 0 0 0 1.891l2.774 2.767.011.013.002.002c.03.034.058.067.088.096.045.045.094.088.146.127l.01.008Z"
        fill={`url(#${id})`}
      />
      <defs>
        <linearGradient id={`${id}`} x1={-2.857} y1={0} x2={21.22} y2={-5.108} gradientUnits="userSpaceOnUse">
          <stop stopColor="#940DFF" />
          <stop offset={1} stopColor="#0094FF" />
          <stop offset={1} stopColor="#0094FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
