import { rgba } from 'polished';
import React from 'react';
import styled, { css } from 'styled-components';
import { Text, TextLink } from '../components';
import { spacings, FontSize, borderRadius, colours } from '../styles';

const PaginationRoot = styled.div`
  display: flex;
  align-items: center;
`;

const PageNoRoot = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.xs};
`;

const buttonStyle = css`
  padding: 0 ${spacings.xs};
  border-radius: ${borderRadius};
`;

const PageButtonDiv = styled.div`
  ${buttonStyle}
  cursor: default;
`;

const PageButtonDisabled = styled.div`
  ${buttonStyle}
  cursor: default;
  opacity: 0.5;
`;

const PageButtonLink = styled(TextLink)`
  ${buttonStyle}

  &:hover {
    background: ${rgba(colours.white, 0.1)};
  }
`;

interface PageButtonProps {
  text: string;
  link?: string;
  active?: boolean;
  disabled?: boolean;
  size?: FontSize;
}

const PageButton: React.FunctionComponent<PageButtonProps> = ({ text, link, active, disabled, size = 's' }) => {
  const textNode = <Text text={text} size={size} weight={active ? 'semibold' : 'light'} />;

  if (!link || active) {
    return <PageButtonDiv>{textNode}</PageButtonDiv>;
  }

  if (disabled) {
    return <PageButtonDisabled>{textNode}</PageButtonDisabled>;
  }

  return <PageButtonLink to={link}>{textNode}</PageButtonLink>;
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
}

export const Pagination: React.FunctionComponent<PaginationProps> = ({
  totalItems,
  page,
  itemsPerPage = 2,
  visiblePages = 3,
  visibleEndPages = 2,
}) => {
  if (!totalItems || !itemsPerPage) {
    return null;
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pages = getVisiblePageNumbers(totalPages, page, visiblePages, visibleEndPages);
  const pageButtons: React.ReactNode[] = [];
  pages.forEach((pageNo, i) => {
    if (i > 0 && pageNo !== pages[i - 1] + 1) {
      pageButtons.push(<PageButton key={`dot-${i}`} text="..." />);
    }
    pageButtons.push(
      <PageButton key={`btn-${i}`} text={`${pageNo}`} link={`/?p=${pageNo}`} active={pageNo === page} />,
    );
  });

  return (
    <PaginationRoot>
      <PageButton text="Prev" size="xs" link={`/?p=${Math.max(0, page - 1)}`} disabled={page <= 1} />
      <PageNoRoot>{pageButtons}</PageNoRoot>
      <PageButton text="Next" size="xs" link={`/?p=${Math.min(totalPages, page + 1)}`} disabled={page >= totalPages} />
    </PaginationRoot>
  );
};
