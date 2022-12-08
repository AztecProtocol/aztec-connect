import type { registrationsDataRaw } from './registrations_data_raw.js';

export type RegistrationsDataRaw = typeof registrationsDataRaw;
export type RegistrationsDataRawAssets = RegistrationsDataRaw['aztec-connect-dev']['assets'] &
  RegistrationsDataRaw['aztec-connect-testnet']['assets'] &
  RegistrationsDataRaw['aztec-connect-prod']['assets'];
export type RegistrationsDataRawBridges = RegistrationsDataRaw['aztec-connect-dev']['bridges'] &
  RegistrationsDataRaw['aztec-connect-testnet']['bridges'] &
  RegistrationsDataRaw['aztec-connect-prod']['bridges'];

export type RegisteredAssetLabel = keyof RegistrationsDataRawAssets;
export type RegisteredBridgeLabel = keyof RegistrationsDataRawBridges;
