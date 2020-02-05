#include "./pedersen_note.hpp"

namespace plonk
{
namespace stdlib
{
namespace pedersen_note
{

note compute_commitment(const field_t<waffle::TurboComposer>& view_key, const uint<waffle::TurboComposer>& value)
{
    typedef field_t<waffle::TurboComposer> field_t;

    waffle::TurboComposer* context = value.get_context();

    field_t k = static_cast<uint<waffle::TurboComposer>>(value);
    
    note_triple p_1 = fixed_base_scalar_mul<32>(k, 0);
    note_triple p_2 = fixed_base_scalar_mul<250>(view_key, 1);

    context->assert_equal(p_2.scalar.witness_index, view_key.witness_index);

    // if k = 0, then k * inv - 1 != 0
    // k * inv - (1 - is_zero)
    field_t one(context, barretenberg::fr::one);
    bool_t is_zero = k.is_zero();

    // If k = 0, our scalar multiplier is going to be nonsense.
    // We need to conditionally validate that, if k != 0, the constructed scalar multiplier matches our input scalar.
    field_t lhs = p_1.scalar * (one - is_zero);
    field_t rhs = k * (one - is_zero);
    lhs.normalize();
    rhs.normalize();
    context->assert_equal(lhs.witness_index, rhs.witness_index);

    // If k = 0 we want to return p_2.base, as g^{0} = 1
    // If k != 0, we want to return p_1.base + p_2.base
    field_t lambda = (p_2.base.y - p_1.base.y) / (p_2.base.x - p_1.base.x);
    field_t x_3 = (lambda * lambda) - (p_2.base.x - p_1.base.x);
    field_t y_3 = lambda * (p_1.base.x - x_3) - p_1.base.y;

    field_t x_4 = (p_2.base.x - x_3) * is_zero + x_3;
    field_t y_4 = (p_2.base.y - y_3) * is_zero + y_3;
    x_4 = x_4.normalize();
    y_4 = y_4.normalize();

    note result{{ x_4, y_4 }};
    return result;
    // context->assert_equal(x_4.witness_index, note.ciphertext.x.witness_index);
    // context->assert_equal(y_4.witness_index, note.ciphertext.y.witness_index);
}
    
}
}
}