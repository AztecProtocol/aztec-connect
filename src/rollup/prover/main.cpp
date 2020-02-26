#include "batch_tx.hpp"
#include "create.hpp"
#include "destroy.hpp"
#include "join.hpp"
#include "join_split.hpp"
#include "split.hpp"
#include "timer.hpp"
#include "user_context.hpp"
#include <barretenberg/waffle/stdlib/merkle_tree/leveldb_store.hpp>

char const* DATA_DB_PATH = "/tmp/rollup_prover";
char const* NULLIFIER_DB_PATH = "/tmp/rollup_prover_nullifier";

using namespace rollup;

rollup_context create_rollup_context(Composer& composer)
{
    // TODO: We can't have distinct databases due to requiring atomicity. Change to use a single db with multiple trees.
    leveldb_store data_db(DATA_DB_PATH, 32);
    leveldb_store nullifier_db(NULLIFIER_DB_PATH, 128);

    std::cout << "DB root: " << data_db.root() << " size: " << data_db.size() << std::endl;
    std::cout << "Nullifier root: " << nullifier_db.root() << " size: " << nullifier_db.size() << std::endl;

    return {
        composer,
        std::move(data_db),
        std::move(nullifier_db),
        public_witness_t(&composer, data_db.size()),
        public_witness_t(&composer, data_db.root()),
        public_witness_t(&composer, nullifier_db.root()),
    };
}

int main(int argc, char** argv)
{
    std::vector<std::string> args(argv, argv + argc);

    if (args.size() > 1 && args[1] == "reset") {
        leveldb::DestroyDB(DATA_DB_PATH, leveldb::Options());
        leveldb::DestroyDB(NULLIFIER_DB_PATH, leveldb::Options());
        return 0;
    }

    // Composer get's corrupted if we use move ctors. Have to create at top level :/
    Composer composer = Composer("../srs_db/ignition");
    rollup_context ctx = create_rollup_context(composer);

    // Read transactions from stdin.
    while (true) {
        batch_tx batch;

        if (!std::cin.good() || std::cin.peek() == std::char_traits<char>::eof()) {
            break;
        }

        read(std::cin, batch);

        Timer circuit_timer;
        for (auto tx : batch.txs) {
            std::cout << tx << std::endl;
            if (!join_split(ctx, tx)) {
                std::cout << "Failed to generate witness data." << std::endl;
                return -1;
            }
        }

        std::cout << "Time taken to create circuit: " << circuit_timer.toString() << std::endl;
        printf("composer gates = %zu\n", ctx.composer.get_num_gates());

        std::cout << "Computing witness..." << std::endl;
        Timer witness_timer;
        ctx.composer.compute_witness();
        std::cout << "Time taken to compute witness: " << witness_timer.toString() << std::endl;

        std::cout << "Creating prover..." << std::endl;
        Timer prover_timer;
        auto prover = ctx.composer.create_prover();
        std::cout << "Time taken to create prover: " << prover_timer.toString() << std::endl;

        std::cout << "Constructing proof..." << std::endl;
        Timer proof_timer;
        waffle::plonk_proof proof = prover.construct_proof();
        std::cout << "Time taken to construct proof: " << proof_timer.toString() << std::endl;

        auto verifier = ctx.composer.create_verifier();
        bool verified = verifier.verify_proof(proof);
        std::cout << "Verified: " << verified << std::endl;

        if (verified) {
            ctx.data_db.commit();
            ctx.nullifier_db.commit();
        }
    }

    return 0;
}
