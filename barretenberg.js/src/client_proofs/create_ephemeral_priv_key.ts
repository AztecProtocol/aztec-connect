import { Grumpkin } from '../ecc/grumpkin';

export const createEphemeralPrivKey = (grumpkin: Grumpkin) => grumpkin.getRandomFr();
