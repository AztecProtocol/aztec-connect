import { default as levelup } from 'levelup';
import { default as leveldown } from 'leveldown';

export function levelUpNodeFactory(path: string) {
  return levelup(leveldown(path));
}
