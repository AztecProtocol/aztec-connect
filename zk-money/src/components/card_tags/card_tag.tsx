import styled, { css } from 'styled-components/macro';

const motifs = {
  white: css`
    background-color: white;
    color: #1c7cff;
  `,
  frost: css`
    background-color: #4db5ff;
    color: white;
  `,
};
type Motif = keyof typeof motifs;

export const CardTag = styled.div<{ motif: Motif }>`
  ${props => motifs[props.motif]}
  font-size: 14px;
  padding: 0 10px;
  border-radius: 5px;
  height: 28px;
  display: flex;
  align-items: center;
`;
