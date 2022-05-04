import styled from 'styled-components/macro';
import { GradientBorder } from 'ui-components';
import { Text } from '../../../../components';
import { borderRadiuses } from '../../../../styles';

const Root = styled.div<{ height: number }>`
  user-select: none;
  position: relative;
  width: 100%;
  height: ${({ height }) => `${height}px`};
  box-shadow: inset 0 0 10px #0004;
  border-radius: ${borderRadiuses.s};
`;

const Cell = styled.div<{ height: number; idx: number; optionCount: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: ${({ optionCount }) => 100 / optionCount}%;
  height: ${({ height }) => `${height}px`};
  text-align: center;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateX(${({ idx }) => idx * 100}%);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  font-weight: 500;
`;

const Switch = styled.div<{ height: number }>`
  position: relative;
  width: 100%;
  height: ${({ height }) => `${height}px`};
  overflow: hidden;
  border-radius: ${borderRadiuses.s};
  box-shadow: 0 0 10px #0004;
`;

const BoldLabels = styled.div<{ innerHeight: number; idx: number; optionCount: number }>`
  width: ${({ optionCount }) => 100 * optionCount}%;
  height: ${({ innerHeight }) => `${innerHeight}px`};
  transform: translateX(${({ idx, optionCount }) => (-idx * 100) / optionCount}%);
  transition: transform 0.2s;
  font-weight: 450;
`;

interface Option<T> {
  value: T;
  label: string;
  sublabel?: React.ReactNode;
}
interface SpeedSwitchProps<T> {
  value: T;
  options: Option<T>[];
  onChangeValue: (value: T) => void;
  height?: number;
}

export function SpeedSwitch<T>({ value, onChangeValue, options, height = 52 }: SpeedSwitchProps<T>) {
  const selectedIdx = options.findIndex(opt => opt.value === value);
  const innerHeight = height - 4;
  return (
    <Root height={height}>
      {options.map((option, idx) => (
        <Cell
          key={idx}
          idx={idx}
          onClick={() => onChangeValue(option.value)}
          optionCount={options.length}
          height={height}
        >
          <Text size="xs" color="gradient" text={option.label} />
          {option.sublabel}
        </Cell>
      ))}
      <Cell idx={selectedIdx} optionCount={options.length} height={height}>
        <Switch height={height}>
          <GradientBorder>
            <BoldLabels idx={selectedIdx} optionCount={options.length} innerHeight={innerHeight}>
              {options.map((option, idx) => (
                <Cell key={idx} idx={idx} optionCount={options.length} height={innerHeight}>
                  <Text size="xs" color="gradient" text={option.label} />
                  {option.sublabel}
                </Cell>
              ))}
            </BoldLabels>
          </GradientBorder>
        </Switch>
      </Cell>
    </Root>
  );
}
