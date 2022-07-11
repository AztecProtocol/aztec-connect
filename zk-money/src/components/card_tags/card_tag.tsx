import styled from 'styled-components/macro';

export const CardTag = styled.div`
  background-color: #00000035;
  color: white;
  font-size: 14px;
  padding: 0 10px;
  border-radius: 5px;
  height: 28px;
  display: flex;
  align-items: center;

  @media (max-width: 480px) {
    font-size: 11px;
  }
`;
