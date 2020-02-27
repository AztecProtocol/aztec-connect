#include "../prover/batch_tx.hpp"
#include "../prover/join_split_tx.hpp"
#include <barretenberg/io/streams.hpp>
#include <iostream>

using namespace rollup;

int main(int argc, char** argv)
{
    std::vector<std::string> args(argv, argv + argc);
    user_context user = create_user_context();

    if (args.size() > 1 && args[1] == "join-split") {
        if (args.size() < 8) {
            std::cout << "usage: " << argv[0]
                      << " join-split <first note index to join> <second note index to join> <first input note value>"
                         " <second input note value> <first output note value> <second output note value>"
                         " [public input] [public output]"
                      << std::endl;
            return -1;
        }

        batch_tx batch;
        batch.batch_num = 0;
        batch.txs.push_back(create_join_split_tx({ args.begin() + 2, args.end() }, user));
        std::cerr << batch.txs[0] << std::endl;
        write(std::cout, batch);
    } else if (args.size() > 1 && args[1] == "join-split-auto") {
        if (args.size() != 3) {
            std::cout << "usage: " << argv[0] << " join-split-auto <num transactions>" << std::endl;
            return -1;
        }

        size_t num_txs = (size_t)atoi(args[2].c_str());
        batch_tx batch;
        batch.batch_num = 0;
        batch.txs.reserve(num_txs);
        batch.txs.push_back(create_join_split_tx({ "0", "0", "-", "-", "50", "50", "100", "0" }, user));
        for (size_t i=0; i<num_txs-1; ++i) {
            auto index1 = std::to_string(i * 2);
            auto index2 = std::to_string(i * 2 + 1);
            batch.txs.push_back(create_join_split_tx({ index1, index2, "50", "50", "50", "50", "0", "0" }, user));
        }

        write(std::cout, batch);
    } else {
        std::cout << "usage: " << args[0] << " [join-split] [join-split-auto ...>]" << std::endl;
        return -1;
    }

    return 0;
}
