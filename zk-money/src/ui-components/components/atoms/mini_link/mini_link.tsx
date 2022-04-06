import { LinkIcon } from '../../icons/link_icon';

interface MiniLinkProps {
  href: string;
}

export function MiniLink(props: MiniLinkProps) {
  return (
    <a href={props.href} target="_blank" rel="noreferrer">
      <LinkIcon />
    </a>
  );
}
