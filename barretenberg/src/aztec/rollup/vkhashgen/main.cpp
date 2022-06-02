#include "../proofs/rollup/index.hpp"
#include "../proofs/notes/native/index.hpp"
#include "../fixtures/test_context.hpp"
#include "../fixtures/compute_or_load_fixture.hpp"
#include "../proofs/join_split/create_noop_join_split_proof.hpp"
#include <common/map.hpp>

namespace rollup {
namespace proofs {
namespace rollup {

using namespace barretenberg;
using namespace notes;

namespace {
join_split::circuit_data js_cd;
account::circuit_data account_cd;
claim::circuit_data claim_cd;
// rollup::circuit_data rollup_1_keyless;
// rollup::circuit_data rollup_2_keyless;
// rollup::circuit_data rollup_3_keyless;
// rollup::circuit_data rollup_4_keyless;
// rollup::circuit_data rollup_5_keyless;
} // namespace

int main()
{
    std::string CRS_PATH = "../srs_db";
    auto srs = std::make_shared<waffle::DynamicFileReferenceStringFactory>(CRS_PATH);
    account_cd = account::get_circuit_data(srs);
    js_cd = join_split::get_circuit_data(srs);
    claim_cd = claim::get_circuit_data(srs);
    std::ofstream vk_hash("../circuits_db/joinsplit.vk_hash", std::ofstream::binary);
    vk_hash << js_cd.proving_key->vk_hash;
    vk_hash.flush();
    vk_hash.open("../circuits_db/account.vk_hash", std::ofstream::binary);
    vk_hash.close();

    vk_hash << account_cd.proving_key->vk_hash;
    vk_hash.flush();
    vk_hash.close();
    vk_hash.open("../circuits_db/claim.vk_hash", std::ofstream::binary);
    vk_hash << claim_cd.proving_key->vk_hash;
    vk_hash.flush();
    vk_hash.close();
    return 0;
}
} // namespace rollup
} // namespace proofs
} // namespace rollup