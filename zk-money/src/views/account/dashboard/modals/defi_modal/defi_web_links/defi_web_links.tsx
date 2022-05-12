import type { DefiRecipe } from 'alt-model/defi/types';
import { Hyperlink, HyperlinkIcon } from 'ui-components';
import style from './defi_web_links.module.css';

interface DefiWebLinksProps {
  recipe: DefiRecipe;
}

export function DefiWebLinks({ recipe }: DefiWebLinksProps) {
  const etherscanHref = `https://etherscan.io/address/${recipe.address.toString()}`;
  return (
    <div className={style.root}>
      <Hyperlink href={etherscanHref} label={'View Contract'} icon={HyperlinkIcon.Open} />
      <Hyperlink href={recipe.website} label={recipe.websiteLabel} icon={HyperlinkIcon.Open} />
    </div>
  );
}
