#include "join_split_tx.hpp"
#include "io.hpp"

namespace rollup {

join_split_tx hton(join_split_tx const& tx) {
    join_split_tx be_tx;
    be_tx.owner_pub_key = hton(tx.owner_pub_key);
    be_tx.public_input = htonl(tx.public_input);
    be_tx.public_output = htonl(tx.public_output);
    be_tx.num_input_notes = htonl(tx.num_input_notes);
    be_tx.input_note_index[0] = htonl(tx.input_note_index[0]);
    be_tx.input_note_index[1] = htonl(tx.input_note_index[1]);
    be_tx.input_note[0] = hton(tx.input_note[0]);
    be_tx.input_note[1] = hton(tx.input_note[1]);
    be_tx.output_note[0] = hton(tx.output_note[0]);
    be_tx.output_note[1] = hton(tx.output_note[1]);
    be_tx.signature = tx.signature;
    return be_tx;
}

join_split_tx ntoh(join_split_tx const& be_tx) {
    join_split_tx tx;
    tx.owner_pub_key = ntoh(be_tx.owner_pub_key);
    tx.public_input = ntohl(be_tx.public_input);
    tx.public_output = ntohl(be_tx.public_output);
    tx.num_input_notes = ntohl(be_tx.num_input_notes);
    tx.input_note_index[0] = ntohl(be_tx.input_note_index[0]);
    tx.input_note_index[1] = ntohl(be_tx.input_note_index[1]);
    tx.input_note[0] = ntoh(be_tx.input_note[0]);
    tx.input_note[1] = ntoh(be_tx.input_note[1]);
    tx.output_note[0] = ntoh(be_tx.output_note[0]);
    tx.output_note[1] = ntoh(be_tx.output_note[1]);
    tx.signature = be_tx.signature;
    return tx;
}

std::ostream& write(std::ostream& os, join_split_tx const& tx) {
    auto be_tx = hton(tx);
    return os.write(reinterpret_cast<char*>(&be_tx), sizeof(be_tx));
}

std::istream& read(std::istream& is, join_split_tx& tx) {
    join_split_tx be_tx;
    is.read(reinterpret_cast<char*>(&be_tx), sizeof(be_tx));
    tx = ntoh(be_tx);
    return is;
}

} // namespace rollup
