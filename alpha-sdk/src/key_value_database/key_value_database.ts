export interface KeyValueDatabase {
  close(): Promise<void>;
  clear(): Promise<void>;

  put(key: string, value: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | undefined>;
  del(key: string): Promise<void>;
}
