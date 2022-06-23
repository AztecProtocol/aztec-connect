export interface PrivacySet {
  value: bigint;
  users: number;
}

export interface PrivacySetJson {
  value: string;
  users: number;
}

export function privacySetsToJson(privacySets: { [key: number]: PrivacySet[] }): {
  [key: string]: PrivacySetJson[];
} {
  const json: { [key: number]: PrivacySetJson[] } = {};
  for (const assetId in privacySets) {
    const assetSets = privacySets[assetId];
    json[assetId] = assetSets.map(set => {
      return {
        value: set.value.toString(),
        users: set.users,
      } as PrivacySetJson;
    });
  }
  return json;
}

export function privacySetsFromJson(privacySets: { [key: string]: PrivacySetJson[] }): {
  [key: number]: PrivacySet[];
} {
  const result: { [key: number]: PrivacySet[] } = {};
  for (const assetId in privacySets) {
    const assetSets = privacySets[assetId];
    result[Number(assetId)] = assetSets.map(set => {
      return {
        value: BigInt(set.value),
        users: set.users,
      } as PrivacySet;
    });
  }
  return result;
}

export function getDefaultPrivacySets() {
  return {
    0: [],
    1: [],
  } as { [key: number]: PrivacySet[] };
}
