#include "./mimc.hpp"

#include "memory.h"

#include "../../keccak/keccak.h"

using namespace barretenberg;

namespace plonk
{
namespace stdlib
{
namespace
{
// num rounds = ceil((security parameter) / log2(mimc exponent))
// for 129 bit security parameter, and x^7, num rounds = 46
constexpr size_t num_mimc_rounds = 46;

fr::field_t mimc_round_constants[num_mimc_rounds];

const auto init_var = [](){
    uint8_t inputs[32]{
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        static_cast<uint8_t>(atoi("m")),
        static_cast<uint8_t>(atoi("i")),
        static_cast<uint8_t>(atoi("m")),
        static_cast<uint8_t>(atoi("c"))
    };
    for (size_t i = 0; i < num_mimc_rounds; ++i)
    {
        keccak256 keccak256_hash = ethash_keccak256(&inputs[0], 32);
        memcpy((void*)&inputs[0], (void*)&keccak256_hash.word64s[0], 32);
        barretenberg::fr::__to_montgomery_form(*(barretenberg::fr::field_t*)&keccak256_hash.word64s[0], mimc_round_constants[i]);
    }
    return true;
}();
}

field_t<waffle::MiMCComposer> mimc_hash(field_t<waffle::MiMCComposer> &input, field_t<waffle::MiMCComposer> &k_in)
{
    // TODO: Hmm, this should really be a std::shared_ptr
    waffle::MiMCComposer *context = input.context;
    ASSERT(context != nullptr);

    if (!barretenberg::fr::eq(input.additive_constant, barretenberg::fr::zero())
        || !barretenberg::fr::eq(input.multiplicative_constant, barretenberg::fr::one()))
    {
        input = input.normalize();
    };
    if (!barretenberg::fr::eq(k_in.additive_constant, barretenberg::fr::zero())
        || !barretenberg::fr::eq(k_in.multiplicative_constant, barretenberg::fr::one()))
    {
        k_in = k_in.normalize();
    }

    // for now assume we have a mimc gate at our disposal

    // each mimc round is (x_in + k + c[i])^7
    barretenberg::fr::field_t x_in = input.witness;
    barretenberg::fr::field_t x_out;
    barretenberg::fr::field_t k = k_in.witness;
    uint32_t k_idx = k_in.witness_index;
    uint32_t x_in_idx = input.witness_index;
    uint32_t x_out_idx;
    ASSERT(k_idx != static_cast<uint32_t>(-1));
    ASSERT(input.witness_index != static_cast<uint32_t>(-1));
    for (size_t i = 0; i < num_mimc_rounds; ++i)
    {
        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t x_cubed;
        barretenberg::fr::__add(x_in, k, T0);
        barretenberg::fr::__add(T0, mimc_round_constants[i], T0);
        barretenberg::fr::__sqr(T0, x_cubed);
        barretenberg::fr::__mul(x_cubed, T0, x_cubed);
        barretenberg::fr::__sqr(x_cubed, x_out);
        barretenberg::fr::__mul(x_out, T0, x_out);

        uint32_t x_cubed_idx = context->add_variable(x_cubed);
        x_out_idx = context->add_variable(x_out);
        context->create_mimc_gate({
            x_in_idx,
            x_cubed_idx,
            k_idx,
            x_out_idx,
            mimc_round_constants[i]
        });
        x_in_idx = x_out_idx;
        barretenberg::fr::copy(x_out, x_in);
    }
    field_t<waffle::MiMCComposer> result(context);
    barretenberg::fr::copy(x_out, result.witness);
    result.witness_index = x_out_idx;
    return result;
}

field_t<waffle::StandardComposer> mimc_hash(field_t<waffle::StandardComposer> input, field_t<waffle::StandardComposer> k_in)
{
    ASSERT(input.context == k_in.context);
    ASSERT(input.context != nullptr);

    field_t<waffle::StandardComposer> x_in = input;
    field_t<waffle::StandardComposer> x_out(input.context);
    for (size_t i = 0; i < num_mimc_rounds; ++i)
    {
        x_out = x_in + k_in + field_t<waffle::StandardComposer>(input.context, mimc_round_constants[i]);
        field_t<waffle::StandardComposer> x_squared = x_out * x_out;
        field_t<waffle::StandardComposer> x_pow_four = x_squared * x_squared;
        x_out = x_pow_four * x_squared * x_out;
        x_in = x_out;
    }
    return x_out;
}
}
}