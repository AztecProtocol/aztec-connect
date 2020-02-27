#pragma once
#include "join_split_tx.hpp"

namespace rollup {

struct batch_tx {
  uint32_t batch_num;
  std::vector<join_split_tx> txs;
};

batch_tx hton(batch_tx const& txs) {
    batch_tx be_txs;
    be_txs.batch_num = htonl(txs.batch_num);
    be_txs.txs.resize(txs.txs.size());
    std::transform(txs.txs.begin(), txs.txs.end(), be_txs.txs.begin(), [](auto& tx){ return hton(tx); });
    return be_txs;
}

batch_tx ntoh(batch_tx const& be_txs) {
    batch_tx txs;
    txs.batch_num = ntohl(be_txs.batch_num);
    txs.txs.resize(be_txs.txs.size());
    std::transform(be_txs.txs.begin(), be_txs.txs.end(), txs.txs.begin(), [](auto& tx){ return ntoh(tx); });
    return txs;
}

std::ostream& write(std::ostream& os, batch_tx const& txs) {
    auto be_txs = hton(txs);
    uint32_t size = static_cast<uint32_t>(txs.txs.size());
    uint32_t nsize = htonl(size);
    os.write(reinterpret_cast<char*>(&be_txs.batch_num), sizeof(be_txs.batch_num));
    os.write(reinterpret_cast<char*>(&nsize), sizeof(nsize));
    for (auto tx : be_txs.txs) {
        write(os, tx);
    }
    return os;
}

std::istream& read(std::istream& is, batch_tx& txs) {
    batch_tx be_txs;
    uint32_t size;
    is.read(reinterpret_cast<char*>(&be_txs.batch_num), sizeof(be_txs.batch_num));
    is.read(reinterpret_cast<char*>(&size), sizeof(size));
    size = ntohl(size);
    be_txs.txs.resize(size);
    for (size_t i=0; i<size; ++i) {
        read(is, be_txs.txs[i]);
    }
    txs = ntoh(be_txs);
    return is;
}

}