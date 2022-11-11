import { GrumpkinAddress } from '@aztec/sdk';
import { Obs } from '../../app/util/index.js';

type UserIdStringToAliasMap = Record<string, string>;

function loadAliases(): UserIdStringToAliasMap {
  try {
    const itemsStr = localStorage.getItem('aliasesByUserIds');
    if (!itemsStr) return {};
    return JSON.parse(itemsStr);
  } catch {
    return {};
  }
}

function saveAliases(aliasesByUserIds: UserIdStringToAliasMap) {
  localStorage.setItem('aliasesByUserIds', JSON.stringify(aliasesByUserIds));
}

export class AliasManager {
  aliasByUserIdStringObs = Obs.input<UserIdStringToAliasMap>(loadAliases());

  setAlias(userId: GrumpkinAddress, alias: string) {
    this.aliasByUserIdStringObs.next({
      ...this.aliasByUserIdStringObs.value,
      [userId.toString()]: alias,
    });
    saveAliases(this.aliasByUserIdStringObs.value);
  }
}
