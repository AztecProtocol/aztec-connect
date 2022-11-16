import React from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import loaderIcon from '../../images/loader.svg';
import style from './loader.module.scss';

const cx = bindStyle(style);

export enum LoaderSize {
  ExtraSmall = 'ExtraSmall',
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
  ExtraLarge = 'ExtraLarge',
}

interface LoaderProps {
  className?: string;
  size?: LoaderSize;
}

export const Loader: React.FunctionComponent<LoaderProps> = (props: LoaderProps) => {
  const { className, size = LoaderSize.Medium } = props;

  return (
    <img
      alt="Loader"
      src={loaderIcon}
      className={cx(
        style.spinner,
        size === LoaderSize.ExtraSmall && style.extraSmall,
        size === LoaderSize.Small && style.small,
        size === LoaderSize.Medium && style.medium,
        size === LoaderSize.Large && style.large,
        size === LoaderSize.ExtraLarge && style.extraLarge,
        className,
      )}
    />
  );
};
