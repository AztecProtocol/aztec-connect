// import { Connection, Repository } from 'typeorm';
// import { InformationKey } from '../entity/key';

// export class KeyDb {
//   private keyRep!: Repository<KeyRep>;
//   private keyID = 0;

//   constructor(private connection: Connection) {}

//   public async init() {
//     this.keyRep = this.connection.getRepository(KeyRep);
//   }

//   public async addKey(key: InformationKey) {
//       const informationKey = new InformationKey();
//       informationKey.id = key.ID;
//       informationKey.key = key;

//       await this.rollupRep.save(rollupDao)
//       this.
//   }

//   public getNextKeyID() {
//     return this.keyID;
//   }
// }
