import styled from 'styled-components/macro';

export const IconButtonBase = styled.button`
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: transparent;
  width: 28px;
  height: 28px;
  border: none;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
