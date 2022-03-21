"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverTreeNotes = void 0;
const address_1 = require("../address");
const grumpkin_1 = require("../ecc/grumpkin");
const derive_note_secret_1 = require("./derive_note_secret");
const tree_note_1 = require("./tree_note");
const recoverTreeNotes = (decryptedNotes, noteCommitments, privateKey, grumpkin, noteAlgorithms) => {
    const ownerPubKey = new address_1.GrumpkinAddress(grumpkin.mul(grumpkin_1.Grumpkin.one, privateKey));
    return decryptedNotes.map((decrypted, i) => {
        if (!decrypted) {
            return;
        }
        const noteCommitment = noteCommitments[i];
        // Note version 1
        {
            const note = tree_note_1.TreeNote.recover(decrypted, ownerPubKey);
            const commitment = noteAlgorithms.valueNoteCommitment(note);
            if (commitment.equals(noteCommitment)) {
                return note;
            }
        }
        // TODO: Deprecate for defi bridge?
        // Note version 0
        {
            const noteSecret = (0, derive_note_secret_1.deriveNoteSecret)(decrypted.ephPubKey, privateKey, grumpkin, 0);
            const note = tree_note_1.TreeNote.recover({ ...decrypted, noteSecret }, ownerPubKey);
            const commitment = noteAlgorithms.valueNoteCommitment(note);
            if (commitment.equals(noteCommitment)) {
                return note;
            }
        }
    });
};
exports.recoverTreeNotes = recoverTreeNotes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3Zlcl90cmVlX25vdGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vdGVfYWxnb3JpdGhtcy9yZWNvdmVyX3RyZWVfbm90ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQTZDO0FBQzdDLDhDQUEyQztBQUUzQyw2REFBd0Q7QUFFeEQsMkNBQXVDO0FBRWhDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsY0FBNkMsRUFDN0MsZUFBeUIsRUFDekIsVUFBa0IsRUFDbEIsUUFBa0IsRUFDbEIsY0FBOEIsRUFDOUIsRUFBRTtJQUNGLE1BQU0sV0FBVyxHQUFHLElBQUkseUJBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDaEYsT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3pDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxPQUFPO1NBQ1I7UUFFRCxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUMsaUJBQWlCO1FBQ2pCO1lBQ0UsTUFBTSxJQUFJLEdBQUcsb0JBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELG1DQUFtQztRQUNuQyxpQkFBaUI7UUFDakI7WUFDRSxNQUFNLFVBQVUsR0FBRyxJQUFBLHFDQUFnQixFQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRixNQUFNLElBQUksR0FBRyxvQkFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBbkNXLFFBQUEsZ0JBQWdCLG9CQW1DM0IifQ==