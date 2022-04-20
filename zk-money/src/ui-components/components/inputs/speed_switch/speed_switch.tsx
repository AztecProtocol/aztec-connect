import styled from 'styled-components/macro';
import { GradientBorder } from 'ui-components';
import { Text } from '../../../../components';
import { borderRadiuses } from '../../../../styles';

const Root = styled.div`
  user-select: none;
  position: relative;
  width: 100%;
  height: 52px;
  box-shadow: inset 0 0 10px #0004;
  border-radius: ${borderRadiuses.s};
`;

const Cell = styled.div<{ idx: number; optionCount: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: ${({ optionCount }) => 100 / optionCount}%;
  height: 52px;
  text-align: center;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateX(${({ idx }) => idx * 100}%);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
`;

const InnerCell = styled(Cell)`
  height: 48px;
`;

const Switch = styled.div`
  position: relative;
  width: 100%;
  height: 52px;
  overflow: hidden;
  border-radius: ${borderRadiuses.s};
  box-shadow: 0 0 10px #0004;
`;

const BoldLabels = styled.div<{ idx: number; optionCount: number }>`
  width: ${({ optionCount }) => 100 * optionCount}%;
  height: 48px;
  transform: translateX(${({ idx, optionCount }) => (-idx * 100) / optionCount}%);
  transition: transform 0.2s;
  font-weight: 500;
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
  className?: string;
}

export function SpeedSwitch<T>({ value, onChangeValue, options, className }: SpeedSwitchProps<T>) {
  const selectedIdx = options.findIndex(opt => opt.value === value);
  return (
    <Root className={className}>
      {options.map((option, idx) => (
        <Cell key={idx} idx={idx} onClick={() => onChangeValue(option.value)} optionCount={options.length}>
          <Text size="xs" color="gradient" text={option.label} />
          {option.sublabel}
        </Cell>
      ))}
      <Cell idx={selectedIdx} optionCount={options.length}>
        <Switch>
          <GradientBorder>
            <BoldLabels idx={selectedIdx} optionCount={options.length}>
              {options.map((option, idx) => (
                <InnerCell key={idx} idx={idx} optionCount={options.length}>
                  <Text size="xs" color="gradient" weight="bold" text={option.label} />
                  {option.sublabel}
                </InnerCell>
              ))}
            </BoldLabels>
          </GradientBorder>
        </Switch>
      </Cell>
    </Root>
  );
}
