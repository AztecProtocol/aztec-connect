#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/sha256_value.hpp>

using namespace barretenberg;
using namespace plonk;

typedef waffle::TurboComposer Composer;
typedef stdlib::field_t<Composer> field_t;
typedef stdlib::bool_t<Composer> bool_t;
typedef stdlib::byte_array<Composer> byte_array;
typedef stdlib::merkle_tree::merkle_tree<Composer> merkle_tree;
typedef stdlib::witness_t<Composer> witness_t;
typedef stdlib::public_witness_t<Composer> public_witness_t;

int main(int argc, char** argv)
{
    if (argc < 2) {
        std::cout << "usage: " << argv[0] << " <index>";
    }

    size_t index_to_increment = (size_t)atoi(argv[1]);

    stdlib::merkle_tree::LevelDbStore db("/tmp/rollup_prover", 32);
    Composer composer = Composer();

    // byte_array old_element = byte_array(&composer, db.get_element(index_to_increment));
    // field_t old_value(old_element.slice(0, 32));
    // field_t new_value = old_value + 1;

    // field_t new_value_witness = public_witness_t(&composer, new_value.get_value());

    std::string old_element = db.get_element(index_to_increment);
    uint32_t old_value = __builtin_bswap32(*(uint32_t*)(old_element.data() + 28));
    stdlib::merkle_tree::fr_hash_path old_path = db.get_hash_path(index_to_increment);
    fr::field_t old_root = db.root();

    uint32_t new_value = old_value + 1;
    std::string new_element = std::string(64, 0);
    *(uint32_t*)(new_element.data() + 28) = __builtin_bswap32(new_value);
    stdlib::merkle_tree::fr_hash_path new_path =
        stdlib::merkle_tree::get_new_hash_path(old_path, index_to_increment, new_element);
    fr::field_t new_root = stdlib::merkle_tree::hash({ new_path[31].first, new_path[31].second });

    merkle_tree tree(composer, db);

    field_t new_value_field = public_witness_t(&composer, new_value);
    field_t old_value_field = new_value_field - 1;
    old_value_field = old_value_field.normalize();

    byte_array old_value_byte_array(&composer);
    old_value_byte_array.write(old_value_field).write(field_t(0ULL));

    byte_array new_value_byte_array(&composer);
    new_value_byte_array.write(new_value_field).write(field_t(0ULL));

    merkle_tree::hash_path old_path_field = tree.create_witness_hash_path(old_path);
    merkle_tree::hash_path new_path_field = tree.create_witness_hash_path(new_path);
    field_t new_root_field = public_witness_t(&composer, new_root);
    field_t old_root_field = public_witness_t(&composer, old_root);
    field_t index_field = public_witness_t(&composer, index_to_increment);

    tree.update_membership(new_root_field,
                           new_path_field,
                           new_value_byte_array,
                           old_root_field,
                           old_path_field,
                           old_value_byte_array,
                           index_field);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool result = verifier.verify_proof(proof);

    std::cout << "Verified: " << result << std::endl;

    return 0;
}