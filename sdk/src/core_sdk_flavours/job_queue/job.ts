export enum JobQueueTarget {
  NOTE_DECRYPTOR = 'NOTE_DECRYPTOR',
  PEDERSEN = 'PEDERSEN',
  PIPPENGER = 'PIPPENGER',
  FFT = 'FFT',
}

export interface Job {
  id: number;
  target: JobQueueTarget;
  query: string;
  args: any[];
}
