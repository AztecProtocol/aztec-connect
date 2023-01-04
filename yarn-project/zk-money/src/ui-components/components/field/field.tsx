import React, { createRef, useState } from 'react';
import { BalanceIndicator, DropdownOption, Select } from '../../index.js';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import successIcon from '../../images/success.svg';
import errorIcon from '../../images/error.svg';
import warningIcon from '../../images/warning.svg';
import { Loader, LoaderSize } from '../loader/index.js';
import style from './field.module.scss';

const cx = bindStyle(style);

export enum Layer {
  L1 = 'L1',
  L2 = 'L2',
}

export enum FieldStatus {
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
  Loading = 'Loading',
}

interface Asset {
  symbol: string;
  id: number;
}

export interface FieldProps {
  value: string;
  label?: string;
  sublabel?: string | JSX.Element;
  message?: string;
  prefix?: string;
  placeholder?: string;
  className?: string;
  balance?: string;
  monospaced?: boolean;
  disabled?: boolean;
  selectedAsset?: Asset;
  layer?: Layer;
  status?: FieldStatus;
  isActionSelected?: boolean;
  allowAssetSelection?: boolean;
  assetOptions?: DropdownOption<number>[] | undefined;
  onClick?: () => void;
  onChangeWalletRequest?: () => void;
  onClickBalanceIndicator?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (value: string) => void;
  onChangeAsset?: (option: number) => void;
}

interface AssetSelectionProps {
  assetOptions: DropdownOption<number>[] | undefined;
  layer: Layer;
  disabled?: boolean;
  selectedAsset: Asset;
  onChangeAsset?: (option: number) => void;
}

function renderStatusIcon(status?: FieldStatus) {
  switch (status) {
    case FieldStatus.Error:
      return <img className={style.icon} alt="Error" src={errorIcon} />;
    case FieldStatus.Warning:
      return <img className={style.icon} alt="Warning" src={warningIcon} />;
    case FieldStatus.Success:
      return <img className={style.icon} alt="Success" src={successIcon} />;
    case FieldStatus.Loading:
      return <Loader className={style.loader} size={LoaderSize.ExtraSmall} />;
  }
  return null;
}

function getAssetPrefix(layer?: Layer) {
  return layer === Layer.L2 ? 'zk' : '';
}

function AssetSelection(props: AssetSelectionProps) {
  const handleAssetChange = (type?: number) => {
    if (type !== undefined && props.onChangeAsset) {
      props.onChangeAsset(type);
    }
  };

  return (
    <div className={style.assetWrapper}>
      {!props.disabled && props.assetOptions && (
        <Select
          allowEmptyValue={false}
          showBorder={false}
          value={props.selectedAsset.id}
          disabled={props.disabled}
          options={props.assetOptions}
          onChange={handleAssetChange}
        />
      )}
      {props.disabled && (
        <div className={style.assetName}>
          {getAssetPrefix(props.layer)}
          {props.selectedAsset.symbol}
        </div>
      )}
    </div>
  );
}

export function Field(props: FieldProps) {
  const [hasChanged, setHasChanged] = useState(false);
  const ref = createRef<HTMLInputElement>();
  const showPrefix = !!props.prefix && (!!props.value || hasChanged);

  const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
    if (!hasChanged) {
      setHasChanged(true);
    }

    if (props.onChangeValue) {
      const newValue = e.currentTarget.value;
      props.onChangeValue(newValue.replace(new RegExp(`^[${props.prefix}]+`), ''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const cursorEnd = ref.current!.selectionEnd!;
    if (showPrefix && props.prefix) {
      if (
        (cursorEnd <= props.prefix.length && ['ArrowLeft', 'Backspace', props.prefix].indexOf(e.key) >= 0) ||
        (cursorEnd < props.prefix.length && e.key.match(new RegExp(`^[^${props.prefix}]$`)))
      ) {
        e.preventDefault();
      }
    }

    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <div className={style.content}>
      {props.label && (
        <div className={style.header}>
          <div className={style.title}>
            {props.label}
            {props.sublabel && <div className={style.subtitle}>{props.sublabel}</div>}
          </div>
        </div>
      )}
      <div className={style.input} onClick={props.onClick}>
        <div className={style.inputWrapper}>
          <div className={style.inputInner}>
            <input
              ref={ref as any}
              disabled={props.disabled}
              className={cx(
                style.field,
                props.disabled && style.disabled,
                props.monospaced && style.monospaced,
                props.status === FieldStatus.Success && style.success,
                props.status === FieldStatus.Error && style.error,
                props.status === FieldStatus.Warning && style.warning,
                props.status === FieldStatus.Loading && style.loading,
                props.selectedAsset && style.fieldHasSelector,
                props.onClick && props.disabled && style.isClickable,
                props.className,
              )}
              value={showPrefix ? `${props.prefix}${props.value}` : props.value}
              placeholder={props.placeholder}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
            />
            {props.selectedAsset && (
              <>
                <AssetSelection
                  layer={props.layer || Layer.L1}
                  disabled={!props.allowAssetSelection || props.disabled}
                  selectedAsset={props.selectedAsset}
                  assetOptions={props.assetOptions}
                  onChangeAsset={props.onChangeAsset}
                />
                {props.balance !== undefined && props.onClickBalanceIndicator && (
                  <BalanceIndicator
                    onClick={props.onClickBalanceIndicator}
                    disabled={!!props.disabled}
                    balance={props.balance}
                    onChangeWalletRequest={props.onChangeWalletRequest}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {renderStatusIcon(props.status)}
      </div>
      <div
        className={cx(
          style.message,
          props.status === FieldStatus.Warning && style.warningMessage,
          props.status === FieldStatus.Error && style.errorMessage,
        )}
      >
        {props.message}
      </div>
    </div>
  );
}
