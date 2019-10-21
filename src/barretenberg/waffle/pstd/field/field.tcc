#ifndef FIELD_TCC
#define FIELD_TCC

#include "../../../assert.hpp"
#include "../../composer/composer_base.hpp"

using namespace barretenberg;

namespace pstd
{
template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext *parent_context) :
context(parent_context)
{
ASSERT(parent_context != nullptr);
additive_constant = fr::zero();
multiplicative_constant = fr::one();
witness = fr::zero();
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext *parent_context, const witness_t &value) :
context(parent_context)
{
ASSERT(parent_context != nullptr);
additive_constant = fr::zero();
multiplicative_constant = fr::one();
fr::copy(value.witness, witness);
witness_index = context->add_variable(witness);
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext *parent_context, const fr::field_t &value) :
context(parent_context)
{
ASSERT(parent_context != nullptr);
fr::copy(value, additive_constant);
multiplicative_constant = fr::one();
witness = fr::zero();
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const field_t &other) : context(other.context)
{
    fr::copy(other.additive_constant, additive_constant);
    fr::copy(other.multiplicative_constant, multiplicative_constant);
    fr::copy(other.witness, witness);
    witness_index = other.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(field_t &&other) : context(other.context)
{
    fr::copy(other.additive_constant, additive_constant);
    fr::copy(other.multiplicative_constant, multiplicative_constant);
    fr::copy(other.witness, witness);
    witness_index = other.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::~field_t() {};

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(const field_t &other)
{
    fr::copy(other.additive_constant, additive_constant);
    fr::copy(other.multiplicative_constant, multiplicative_constant);
    fr::copy(other.witness, witness);
    witness_index = other.witness_index;
    return *this;
}

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(field_t &&other)
{
    fr::copy(other.additive_constant, additive_constant);
    fr::copy(other.multiplicative_constant, multiplicative_constant);
    fr::copy(other.witness, witness);
    witness_index = other.witness_index;
    return *this;
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator+(const field_t &other)
{
    ASSERT(context == other.context);
    field_t<ComposerContext> result(context);

    
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // both inputs are constant - don't add a gate
        fr::__add(additive_constant, other.additive_constant, result.additive_constant);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // one input is constant - don't add a gate, but update scaling factors
        fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        fr::copy(multiplicative_constant, result.multiplicative_constant);
        fr::copy(witness, result.witness);
        result.witness_index = witness_index;
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        fr::copy(other.multiplicative_constant, result.multiplicative_constant);
        fr::copy(other.witness, result.witness);
        result.witness_index = other.witness_index;
    }
    else
    {
        // both inputs map to circuit varaibles - create a + constraint
        fr::field_t T0;
        fr::__mul(witness, multiplicative_constant, result.witness);
        fr::__mul(other.witness, other.multiplicative_constant, T0);
        fr::__add(result.witness, T0, result.witness);
        fr::__add(result.witness, additive_constant, result.witness);
        fr::__add(result.witness, other.additive_constant, result.witness);

        result.witness_index = context->add_variable(result.witness);
        const waffle::add_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            multiplicative_constant,
            other.multiplicative_constant,
            fr::neg_one(),
            fr::add(additive_constant, other.additive_constant)
        };
        context->create_add_gate(gate_coefficients);
    }
    return result;    
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator-(const field_t &other)
{
    field_t<ComposerContext> rhs(other);
    fr::__neg(rhs.additive_constant, rhs.additive_constant);
    fr::__neg(rhs.multiplicative_constant, rhs.multiplicative_constant);
    return operator+(rhs);
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator*(const field_t &other)
{
    ASSERT(context == other.context);
    field_t<ComposerContext> result(context);

    
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // both inputs are constant - don't add a gate
        fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // one input is constant - don't add a gate, but update scaling factors
        fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        fr::__mul(multiplicative_constant, other.additive_constant, result.multiplicative_constant);
        fr::copy(witness, result.witness);
        result.witness_index = witness_index;
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        fr::__mul(other.multiplicative_constant, additive_constant, result.multiplicative_constant);
        fr::copy(other.witness, result.witness);
        result.witness_index = other.witness_index;
    }
    else
    {
        // both inputs map to circuit varaibles - create a + constraint
        fr::field_t T0;
        fr::field_t q_m;
        fr::field_t q_l;
        fr::field_t q_r;
        fr::field_t q_c;

        fr::__mul(additive_constant, other.additive_constant, q_c);
        fr::__mul(additive_constant, other.multiplicative_constant, q_r);
        fr::__mul(multiplicative_constant, other.additive_constant, q_l);
        fr::__mul(multiplicative_constant, other.multiplicative_constant, q_m);

        fr::__mul(witness, other.witness, result.witness);
        fr::__mul(result.witness, q_m, result.witness);
        fr::__mul(witness, q_l, T0);
        fr::__add(result.witness, T0, result.witness);
        fr::__mul(other.witness, q_r, T0);
        fr::__add(result.witness, T0, result.witness);
        fr::__add(result.witness, q_c, result.witness);

        result.witness_index = context->add_variable(result.witness);
        const waffle::poly_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            q_m,
            q_l,
            q_r,
            fr::neg_one(),
            q_c
        };
        context->create_poly_gate(gate_coefficients);
    }
    return result;    
}


// template <typename ComposerContext>
// field_t<ComposerContext> field_t<ComposerContext>::operator/(const field_t &other)
// {
// }

}

#endif