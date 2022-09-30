import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'eth_event' })
export class EthEventDao {
  public constructor(init?: Partial<EthEventDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public transactionHash!: string;

  @PrimaryColumn()
  public logIndex!: number;

  @Column()
  public transactionIndex!: number;

  @Column()
  public blockNumber!: number;

  @Column()
  public blockHash!: string;

  @Column()
  public address!: string;

  @Column()
  @Index()
  public mainTopic!: string;

  @Column('simple-array')
  public topics!: string[];

  @Column('text')
  public data!: string;

  @Column()
  public removed!: boolean;
}
