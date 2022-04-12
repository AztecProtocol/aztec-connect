import React from 'react';
import styled, { css } from 'styled-components/macro';
import { FontSize, fontWeights, spacings } from '../styles';
import { Text } from './text';

const PaginationRoot = styled.div`
  display: flex;
  align-items: center;
  margin: 0 -${spacings.xs};
`;

const PageNoRoot = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.xs};
`;

const buttonStyle = css`
  padding: 0 ${spacings.xs};
  user-select: none;
`;

const PageButtonDiv = styled.div`
  ${buttonStyle}
  font-weight: ${fontWeights.semibold};
  cursor: default;
`;

const PageButtonDisabled = styled.div`
  ${buttonStyle}
  cursor: default;
  opacity: 0.5;
`;

const PageButtonLink = styled.div`
  ${buttonStyle}
  cursor: pointer;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

interface PageButtonProps {
  text: string;
  active?: boolean;
  disabled?: boolean;
  size?: FontSize;
  onClick?: () => void;
}

const PageButton: React.FunctionComponent<PageButtonProps> = ({ text, active, disabled, size = 's', onClick }) => {
  const textNode = <Text text={text} size={size} weight={active ? 'semibold' : 'normal'} />;

  if (active) {
    return <PageButtonDiv>{textNode}</PageButtonDiv>;
  }

  if (disabled) {
    return <PageButtonDisabled>{textNode}</PageButtonDisabled>;
  }

  return <PageButtonLink onClick={onClick}>{textNode}</PageButtonLink>;
};

export const getVisiblePageNumbers = (totalPages: number, page: number, visiblePages: number, visibleEndPages = 0) => {
  const pages: number[] = [];

  const addPageRange = (start: number, end: number) => {
    for (let i = Math.max(start, 1 + (pages[pages.length - 1] || -1)); i <= end; ++i) {
      pages.push(i);
    }
  };

  const headEnd = Math.min(visibleEndPages, totalPages);
  addPageRange(1, headEnd);

  let bodyStart = Math.max(1, page - Math.floor((visiblePages - 1) / 2));
  const bodyEnd = Math.min(bodyStart + visiblePages - 1, totalPages);
  bodyStart = Math.max(1, bodyEnd - visiblePages + 1);
  addPageRange(bodyStart, bodyEnd);

  const tailStart = Math.max(bodyEnd + 1, totalPages - visibleEndPages + 1);
  addPageRange(tailStart, totalPages);

  return pages;
};

interface PaginationProps {
  totalItems: number;
  page: number;
  itemsPerPage?: number;
  visiblePages?: number;
  visibleEndPages?: number;
  onChangePage: (page: number) => void;
}

export const Pagination: React.FunctionComponent<PaginationProps> = ({
  totalItems,
  page,
  itemsPerPage = 2,
  visiblePages = 3,
  visibleEndPages = 2,
  onChangePage,
}) => {
  if (!totalItems || !itemsPerPage) {
    return null;
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return <></>;

  const pages = getVisiblePageNumbers(totalPages, page, visiblePages, visibleEndPages);
  const pageButtons: React.ReactNode[] = [];
  pages.forEach((pageNo, i) => {
    if (i > 0 && pageNo !== pages[i - 1] + 1) {
      pageButtons.push(<PageButton key={`dot-${i}`} text="..." />);
    }
    pageButtons.push(
      <PageButton key={`btn-${i}`} text={`${pageNo}`} onClick={() => onChangePage(pageNo)} active={pageNo === page} />,
    );
  });

  return (
    <PaginationRoot>
      <PageButton text="Prev" size="xs" onClick={() => onChangePage(Math.max(0, page - 1))} disabled={page <= 1} />
      <PageNoRoot>{pageButtons}</PageNoRoot>
      <PageButton
        text="Next"
        size="xs"
        onClick={() => onChangePage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      />
    </PaginationRoot>
  );
};
