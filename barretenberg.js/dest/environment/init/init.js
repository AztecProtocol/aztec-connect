"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitHelpers = void 0;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const bigint_buffer_1 = require("../../bigint_buffer");
const pathTools = (0, tslib_1.__importStar)(require("path"));
const init_config_1 = require("./init_config");
const NOTE_LENGTH = 32;
const ADDRESS_LENGTH = 64;
const ALIAS_HASH_LENGTH = 28;
const NULLIFIER_LENGTH = 32;
const SIGNING_KEY_LENGTH = 32;
class InitHelpers {
    static getInitRoots(chainId) {
        const { initDataRoot, initNullRoot, initRootsRoot } = (0, init_config_1.getInitData)(chainId).initRoots;
        return {
            initDataRoot: Buffer.from(initDataRoot, 'hex'),
            initNullRoot: Buffer.from(initNullRoot, 'hex'),
            initRootsRoot: Buffer.from(initRootsRoot, 'hex'),
        };
    }
    static getInitDataSize(chainId) {
        return (0, init_config_1.getInitData)(chainId).initDataSize;
    }
    static getAccountDataFile(chainId) {
        if (!(0, init_config_1.getInitData)(chainId).accounts) {
            return undefined;
        }
        const relPathToFile = (0, init_config_1.getInitData)(chainId).accounts;
        const fullPath = pathTools.resolve(__dirname, relPathToFile);
        return fullPath;
    }
    static getRootDataFile(chainId) {
        if (!(0, init_config_1.getInitData)(chainId).roots) {
            return undefined;
        }
        const relPathToFile = (0, init_config_1.getInitData)(chainId).roots;
        const fullPath = pathTools.resolve(__dirname, relPathToFile);
        return fullPath;
    }
    static async writeData(filePath, data) {
        const path = pathTools.resolve(__dirname, filePath);
        const fileHandle = await fs_1.promises.open(path, 'w');
        const { bytesWritten } = await fileHandle.write(data);
        await fileHandle.close();
        return bytesWritten;
    }
    static async readData(filePath) {
        const path = pathTools.resolve(__dirname, filePath);
        try {
            const fileHandle = await fs_1.promises.open(path, 'r');
            const data = await fileHandle.readFile();
            await fileHandle.close();
            return data;
        }
        catch (err) {
            console.log(`Failed to read file: ${path}. Error: ${err}`);
            return Buffer.alloc(0);
        }
    }
    static async writeAccountTreeData(accountData, filePath) {
        accountData.forEach(account => {
            if (account.notes.note1.length !== NOTE_LENGTH) {
                throw new Error(`Note1 has length ${account.notes.note1.length}, it should be ${NOTE_LENGTH}`);
            }
            if (account.notes.note2.length !== NOTE_LENGTH) {
                throw new Error(`Note2 has length ${account.notes.note2.length}, it should be ${NOTE_LENGTH}`);
            }
            if (account.alias.aliasHash.length !== ALIAS_HASH_LENGTH) {
                throw new Error(`Alias hash has length ${account.alias.aliasHash.length}, it should be ${ALIAS_HASH_LENGTH}`);
            }
            if (account.alias.address.length !== ADDRESS_LENGTH) {
                throw new Error(`Alias grumpkin address has length ${account.alias.address.length}, it should be ${ADDRESS_LENGTH}`);
            }
            if (account.nullifier.length !== NULLIFIER_LENGTH) {
                throw new Error(`Nullifier has length ${account.nullifier.length}, it should be ${NULLIFIER_LENGTH}`);
            }
            if (account.signingKeys.signingKey1.length !== SIGNING_KEY_LENGTH) {
                throw new Error(`Signing Key 1 has length ${account.signingKeys.signingKey1.length}, it should be ${SIGNING_KEY_LENGTH}`);
            }
            if (account.signingKeys.signingKey2.length !== SIGNING_KEY_LENGTH) {
                throw new Error(`Signing Key 2 has length ${account.signingKeys.signingKey2.length}, it should be ${SIGNING_KEY_LENGTH}`);
            }
        });
        const dataToWrite = accountData.flatMap(account => {
            const nonBuf = Buffer.alloc(4);
            nonBuf.writeUInt32BE(account.alias.nonce);
            return [
                nonBuf,
                account.alias.aliasHash,
                account.alias.address,
                account.notes.note1,
                account.notes.note2,
                account.nullifier,
                account.signingKeys.signingKey1,
                account.signingKeys.signingKey2,
            ];
        });
        return await this.writeData(filePath, Buffer.concat(dataToWrite));
    }
    static parseAccountTreeData(data) {
        const lengthOfAccountData = 4 + ALIAS_HASH_LENGTH + ADDRESS_LENGTH + 2 * NOTE_LENGTH + NULLIFIER_LENGTH + 2 * SIGNING_KEY_LENGTH;
        const numAccounts = data.length / lengthOfAccountData;
        if (numAccounts === 0) {
            return [];
        }
        const accounts = new Array(numAccounts);
        for (let i = 0; i < numAccounts; i++) {
            let start = i * lengthOfAccountData;
            const alias = {
                nonce: data.readUInt32BE(start),
                aliasHash: data.slice(start + 4, start + (4 + ALIAS_HASH_LENGTH)),
                address: data.slice(start + (4 + ALIAS_HASH_LENGTH), start + (4 + ALIAS_HASH_LENGTH + ADDRESS_LENGTH)),
            };
            start += 4 + ALIAS_HASH_LENGTH + ADDRESS_LENGTH;
            const notes = {
                note1: data.slice(start, start + NOTE_LENGTH),
                note2: data.slice(start + NOTE_LENGTH, start + 2 * NOTE_LENGTH),
            };
            start += 2 * NOTE_LENGTH;
            const nullifier = data.slice(start, start + NULLIFIER_LENGTH);
            start += NULLIFIER_LENGTH;
            const signingKeys = {
                signingKey1: data.slice(start, start + SIGNING_KEY_LENGTH),
                signingKey2: data.slice(start + SIGNING_KEY_LENGTH, start + 2 * SIGNING_KEY_LENGTH),
            };
            const account = {
                notes,
                nullifier,
                alias,
                signingKeys,
            };
            accounts[i] = account;
        }
        return accounts;
    }
    static async readAccountTreeData(filePath) {
        const data = await this.readData(filePath);
        return this.parseAccountTreeData(data);
    }
    static async populateDataAndRootsTrees(accounts, merkleTree, dataTreeIndex, rootsTreeIndex) {
        const stepSize = 1000;
        const entries = accounts.flatMap((account, index) => {
            return [
                {
                    treeId: dataTreeIndex,
                    index: BigInt(index * 2),
                    value: account.notes.note1,
                },
                {
                    treeId: dataTreeIndex,
                    index: BigInt(1 + index * 2),
                    value: account.notes.note2,
                },
            ];
        });
        let i = 0;
        while (i < entries.length) {
            if (i % 1000 == 0) {
                console.log(`Inserted ${i}/${entries.length} entries into data tree...`);
            }
            await merkleTree.batchPut(entries.slice(i, i + stepSize));
            i += stepSize;
        }
        const dataRoot = merkleTree.getRoot(dataTreeIndex);
        await merkleTree.put(rootsTreeIndex, BigInt(0), dataRoot);
        const rootsRoot = merkleTree.getRoot(rootsTreeIndex);
        return { dataRoot, rootsRoot };
    }
    static async populateNullifierTree(accounts, merkleTree, nullTreeIndex) {
        const stepSize = 1000;
        const emptyBuffer = Buffer.alloc(32, 0);
        const entries = accounts.flatMap((account) => {
            const nullifiers = [];
            if (account.nullifier.compare(emptyBuffer)) {
                nullifiers.push({
                    treeId: nullTreeIndex,
                    index: (0, bigint_buffer_1.toBigIntBE)(account.nullifier),
                    value: (0, bigint_buffer_1.toBufferBE)(BigInt(1), 32),
                });
            }
            return nullifiers;
        });
        let i = 0;
        while (i < entries.length) {
            if (i % 1000 == 0) {
                console.log(`Inserted ${i}/${entries.length} entries into nullifier tree...`);
            }
            await merkleTree.batchPut(entries.slice(i, i + stepSize));
            i += stepSize;
        }
        const root = merkleTree.getRoot(nullTreeIndex);
        return root;
    }
    static async writeRoots(roots, filePath) {
        return await this.writeData(filePath, Buffer.from(JSON.stringify({
            dataRoot: roots.dataRoot.toString('hex'),
            nullRoot: roots.nullRoot.toString('hex'),
            rootsRoot: roots.rootsRoot.toString('hex'),
        })));
    }
    static async readRoots(filePath) {
        const data = await this.readData(filePath);
        if (!data.length) {
            return;
        }
        const roots = JSON.parse(data.toString());
        return {
            dataRoot: Buffer.from(roots.dataRoot, 'hex'),
            nullRoot: Buffer.from(roots.nullRoot, 'hex'),
            rootsRoot: Buffer.from(roots.rootsRoot, 'hex'),
        };
    }
}
exports.InitHelpers = InitHelpers;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lbnZpcm9ubWVudC9pbml0L2luaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLDJCQUFvQztBQUVwQyx1REFBNkQ7QUFDN0QsNkRBQWtDO0FBQ2xDLCtDQUE0QztBQUU1QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFDdkIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO0FBQzFCLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDO0FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0FBQzVCLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBK0I5QixNQUFhLFdBQVc7SUFDZixNQUFNLENBQUMsWUFBWSxDQUFDLE9BQWU7UUFDeEMsTUFBTSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLEdBQUcsSUFBQSx5QkFBVyxFQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNyRixPQUFPO1lBQ0wsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQztZQUM5QyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDO1lBQzlDLGFBQWEsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7U0FDakQsQ0FBQztJQUNKLENBQUM7SUFFTSxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQWU7UUFDM0MsT0FBTyxJQUFBLHlCQUFXLEVBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDO0lBQzNDLENBQUM7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsT0FBZTtRQUM5QyxJQUFJLENBQUMsSUFBQSx5QkFBVyxFQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUNsQyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELE1BQU0sYUFBYSxH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