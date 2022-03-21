"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDecryptNotes = void 0;
const address_1 = require("../address");
const viewing_key_1 = require("../viewing_key");
const derive_note_secret_1 = require("./derive_note_secret");
const batchDecryptNotes = async (viewingKeys, inputNullifiers, privateKey, noteAlgorithms, grumpkin) => {
    const decryptedNoteLength = 73;
    const dataBuf = await noteAlgorithms.batchDecryptNotes(viewingKeys, privateKey);
    const notes = [];
    // For each note in the buffer of decrypted notes.
    for (let i = 0, startIndex = 0; startIndex < dataBuf.length; ++i, startIndex += decryptedNoteLength) {
        // Slice the individual note out the buffer.
        const noteBuf = dataBuf.slice(startIndex, startIndex + decryptedNoteLength);
        // If we sliced some data, and the "successfully decrypted" byte is set...
        if (noteBuf.length > 0 && noteBuf[0]) {
            // Extract the ephemeral public key from the end of viewing key data.
            const ephPubKey = new address_1.GrumpkinAddress(viewingKeys.slice((i + 1) * viewing_key_1.ViewingKey.SIZE - 64, (i + 1) * viewing_key_1.ViewingKey.SIZE));
            const noteSecret = (0, derive_note_secret_1.deriveNoteSecret)(ephPubKey, privateKey, grumpkin);
            notes[i] = { noteBuf: noteBuf.slice(1), ephPubKey, noteSecret, inputNullifier: inputNullifiers[i] };
        }
    }
    return notes;
};
exports.batchDecryptNotes = batchDecryptNotes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2hfZGVjcnlwdF9ub3Rlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub3RlX2FsZ29yaXRobXMvYmF0Y2hfZGVjcnlwdF9ub3Rlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx3Q0FBNkM7QUFFN0MsZ0RBQTRDO0FBQzVDLDZEQUF3RDtBQUdqRCxNQUFNLGlCQUFpQixHQUFHLEtBQUssRUFDcEMsV0FBbUIsRUFDbkIsZUFBeUIsRUFDekIsVUFBa0IsRUFDbEIsY0FBOEIsRUFDOUIsUUFBa0IsRUFDbEIsRUFBRTtJQUNGLE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0lBQy9CLE1BQU0sT0FBTyxHQUFHLE1BQU0sY0FBYyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoRixNQUFNLEtBQUssR0FBa0MsRUFBRSxDQUFDO0lBRWhELGtEQUFrRDtJQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBRTtRQUNuRyw0Q0FBNEM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsVUFBVSxHQUFHLG1CQUFtQixDQUFDLENBQUM7UUFFNUUsMEVBQTBFO1FBQzFFLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BDLHFFQUFxRTtZQUNyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFlLENBQ25DLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsd0JBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLHdCQUFVLENBQUMsSUFBSSxDQUFDLENBQzdFLENBQUM7WUFDRixNQUFNLFVBQVUsR0FBRyxJQUFBLHFDQUFnQixFQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDckUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDckc7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQyxDQUFDO0FBM0JXLFFBQUEsaUJBQWlCLHFCQTJCNUIifQ==