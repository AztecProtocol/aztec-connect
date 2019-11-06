#ifndef PLONK_FIELD_TCC
#define PLONK_FIELD_TCC

#include "../../../fields/fr.hpp"
#include "../../../assert.hpp"
#include "../../composer/composer_base.hpp"
#include "../bool/bool.hpp"

namespace plonk
{
namespace stdlib
{
template <typename ComposerContext>
field_t<ComposerContext>::field_t() :
    context(nullptr),
    additive_constant(barretenberg::fr::zero()),
    multiplicative_constant(barretenberg::fr::one()),
    witness(barretenberg::fr::zero()),
    witness_index(static_cast<uint32_t>(-1)) {}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext *parent_context) :
context(parent_context)
{
ASSERT(parent_context != nullptr);
additive_constant = barretenberg::fr::zero();
multiplicative_constant = barretenberg::fr::one();
witness = barretenberg::fr::zero();
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const witness_t<ComposerContext> &value) :
context(value.context)
{
ASSERT(context != nullptr);
additive_constant = barretenberg::fr::zero();
multiplicative_constant = barretenberg::fr::one();
barretenberg::fr::copy(value.witness, witness);
witness_index = value.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext *parent_context, const barretenberg::fr::field_t &value) :
context(parent_context)
{
ASSERT(parent_context != nullptr);
barretenberg::fr::copy(value, additive_constant);
multiplicative_constant = barretenberg::fr::one();
witness = barretenberg::fr::zero();
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const field_t &other) : context(other.context)
{
    barretenberg::fr::copy(other.additive_constant, additive_constant);
    barretenberg::fr::copy(other.multiplicative_constant, multiplicative_constant);
    barretenberg::fr::copy(other.witness, witness);
    witness_index = other.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(field_t &&other) : context(other.context)
{
    barretenberg::fr::copy(other.additive_constant, additive_constant);
    barretenberg::fr::copy(other.multiplicative_constant, multiplicative_constant);
    barretenberg::fr::copy(other.witness, witness);
    witness_index = other.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::~field_t() {}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const bool_t<ComposerContext> &other)
{
    context = other.context;
    witness = other.witness;
    witness_index = other.witness_index;
    additive_constant = other.witness_inverted ? barretenberg::fr::one() : barretenberg::fr::zero();
    multiplicative_constant = other.witness_inverted ? barretenberg::fr::neg_one() : barretenberg::fr::one();
}

template <typename ComposerContext>
field_t<ComposerContext>::operator bool_t<ComposerContext>()
{
    bool add_constant_check = barretenberg::fr::eq(additive_constant, barretenberg::fr::zero());
    bool mul_constant_check = barretenberg::fr::eq(multiplicative_constant, barretenberg::fr::one());
    bool inverted_check = barretenberg::fr::eq(additive_constant, barretenberg::fr::one()) && barretenberg::fr::eq(multiplicative_constant, barretenberg::fr::neg_one());
    if ((!add_constant_check || !mul_constant_check) && !inverted_check)
    {
        normalize();
    }

    ASSERT(barretenberg::fr::eq(witness, barretenberg::fr::zero()) || barretenberg::fr::eq(witness, barretenberg::fr::one()));
    bool_t<ComposerContext> result(context);
    result.witness = witness;
    result.witness_bool = barretenberg::fr::eq(witness, barretenberg::fr::one());
    result.witness_inverted = inverted_check;
    result.witness_index = witness_index;
    // TODO THIS SHOULD ADD A BOOL GATE
    return result;
}

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(const field_t &other)
{
    ASSERT(context == other.context || other.context == nullptr || context == nullptr);
    barretenberg::fr::copy(other.additive_constant, additive_constant);
    barretenberg::fr::copy(other.multiplicative_constant, multiplicative_constant);
    barretenberg::fr::copy(other.witness, witness);
    witness_index = other.witness_index;
    if (context == nullptr && other.context != nullptr)
    {
        context = other.context;
    }
    return *this;
}

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(field_t &&other)
{
    ASSERT(context == other.context || other.context == nullptr || context == nullptr);
    barretenberg::fr::copy(other.additive_constant, additive_constant);
    barretenberg::fr::copy(other.multiplicative_constant, multiplicative_constant);
    barretenberg::fr::copy(other.witness, witness);
    witness_index = other.witness_index;
    if (context == nullptr && other.context != nullptr)
    {
        context = other.context;
    }
    return *this;
}

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(const barretenberg::fr::field_t &value)
{
    witness_index = static_cast<uint32_t>(-1);
    barretenberg::fr::copy(value, witness);
    barretenberg::fr::copy(barretenberg::fr::zero(), additive_constant);
    barretenberg::fr::copy(barretenberg::fr::one(), multiplicative_constant);
}

template <typename ComposerContext>
field_t<ComposerContext>& field_t<ComposerContext>::operator=(const uint64_t value)
{
    witness_index = static_cast<uint32_t>(-1);
    witness = barretenberg::fr::to_montgomery_form({{
        value, 0, 0, 0
    }});
    barretenberg::fr::copy(barretenberg::fr::zero(), additive_constant);
    barretenberg::fr::copy(barretenberg::fr::one(), multiplicative_constant);
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator+(const field_t &other)
{
    ASSERT(context == other.context || other.context == nullptr);
    field_t<ComposerContext> result(context);

    
    if (witness_index == other.witness_index)
    {
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__add(multiplicative_constant, other.multiplicative_constant, result.multiplicative_constant);
        result.witness_index = witness_index;
    }
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // both inputs are constant - don't add a gate
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // one input is constant - don't add a gate, but update scaling factors
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::copy(multiplicative_constant, result.multiplicative_constant);
        barretenberg::fr::copy(witness, result.witness);
        result.witness_index = witness_index;
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::copy(other.multiplicative_constant, result.multiplicative_constant);
        barretenberg::fr::copy(other.witness, result.witness);
        result.witness_index = other.witness_index;
    }
    else
    {
        // both inputs map to circuit varaibles - create a + constraint
        barretenberg::fr::field_t T0;
        barretenberg::fr::__mul(witness, multiplicative_constant, result.witness);
        barretenberg::fr::__mul(other.witness, other.multiplicative_constant, T0);
        barretenberg::fr::__add(result.witness, T0, result.witness);
        barretenberg::fr::__add(result.witness, additive_constant, result.witness);
        barretenberg::fr::__add(result.witness, other.additive_constant, result.witness);

        result.witness_index = context->add_variable(result.witness);
        const waffle::add_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            multiplicative_constant,
            other.multiplicative_constant,
            barretenberg::fr::neg_one(),
            barretenberg::fr::add(additive_constant, other.additive_constant)
        };
        context->create_add_gate(gate_coefficients);
    }
    return result;    
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator-(const field_t &other)
{
    ASSERT(context == other.context || other.context == nullptr);
    field_t<ComposerContext> rhs(other);
    barretenberg::fr::__neg(rhs.additive_constant, rhs.additive_constant);
    barretenberg::fr::__neg(rhs.multiplicative_constant, rhs.multiplicative_constant);
    return operator+(rhs);
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator*(const field_t &other)
{
    ASSERT(context == other.context || other.context == nullptr);
    field_t<ComposerContext> result(context);

    
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // both inputs are constant - don't add a gate
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // one input is constant - don't add a gate, but update scaling factors
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(multiplicative_constant, other.additive_constant, result.multiplicative_constant);
        barretenberg::fr::copy(witness, result.witness);
        result.witness_index = witness_index;
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(other.multiplicative_constant, additive_constant, result.multiplicative_constant);
        barretenberg::fr::copy(other.witness, result.witness);
        result.witness_index = other.witness_index;
    }
    else
    {
        // both inputs map to circuit varaibles - create a * constraint
        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t q_m;
        barretenberg::fr::field_t q_l;
        barretenberg::fr::field_t q_r;
        barretenberg::fr::field_t q_c;

        barretenberg::fr::__mul(additive_constant, other.additive_constant, q_c);
        barretenberg::fr::__mul(additive_constant, other.multiplicative_constant, q_r);
        barretenberg::fr::__mul(multiplicative_constant, other.additive_constant, q_l);
        barretenberg::fr::__mul(multiplicative_constant, other.multiplicative_constant, q_m);

        barretenberg::fr::__mul(witness, other.witness, result.witness);
        barretenberg::fr::__mul(result.witness, q_m, result.witness);
        barretenberg::fr::__mul(witness, q_l, T0);
        barretenberg::fr::__add(result.witness, T0, result.witness);
        barretenberg::fr::__mul(other.witness, q_r, T0);
        barretenberg::fr::__add(result.witness, T0, result.witness);
        barretenberg::fr::__add(result.witness, q_c, result.witness);

        result.witness_index = context->add_variable(result.witness);
        const waffle::poly_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            q_m,
            q_l,
            q_r,
            barretenberg::fr::neg_one(),
            q_c
        };
        context->create_poly_gate(gate_coefficients);
    }
    return result;    
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator/(const field_t &other)
{
    ASSERT(context == other.context || other.context == nullptr);
    field_t<ComposerContext> result(context);

    barretenberg::fr::field_t additive_multiplier = barretenberg::fr::one();

    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // both inputs are constant - don't add a gate
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero()))
        {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, additive_multiplier, result.additive_constant);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // one input is constant - don't add a gate, but update scaling factors
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero()))
        {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, additive_multiplier, result.additive_constant);
        barretenberg::fr::__mul(multiplicative_constant, additive_multiplier, result.multiplicative_constant);
        barretenberg::fr::copy(witness, result.witness);
        result.witness_index = witness_index;
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero()))
        {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(other.multiplicative_constant, additive_constant, result.multiplicative_constant);
        barretenberg::fr::copy(other.witness, result.witness);
        result.witness_index = other.witness_index;
    }
    else
    {
        // even if LHS is constant, if divisor is not constant we need a gate to compute the inverse
        // barretenberg::fr::field_t witness_multiplier = barretenberg::fr::invert(other.witness);
        // m1.x1 + a1 / (m2.x2 + a2) = x3
        barretenberg::fr::field_t T0;
        barretenberg::fr::__mul(multiplicative_constant, witness, T0);
        barretenberg::fr::__add(T0, additive_constant, T0);
        barretenberg::fr::field_t T1;
        barretenberg::fr::__mul(other.multiplicative_constant, other.witness, T1);
        barretenberg::fr::__add(T1, other.additive_constant, T1);
        
        result.witness = barretenberg::fr::mul(T0, barretenberg::fr::invert(T1));
        result.witness_index = context->add_variable(result.witness);

        // m2.x2.x3 + a2.x3 = m1.x1 + a1
        // m2.x2.x3 + a2.x3 - m1.x1 - a1 = 0
        // left = x3
        // right = x2
        // out = x1
        // qm = m2
        // ql = a2
        // qr = 0
        // qo = -m1
        // qc = -a1
        barretenberg::fr::field_t q_m = other.multiplicative_constant;
        barretenberg::fr::field_t q_l = other.additive_constant;
        barretenberg::fr::field_t q_r = barretenberg::fr::zero();
        barretenberg::fr::field_t q_o = barretenberg::fr::neg(multiplicative_constant);
        barretenberg::fr::field_t q_c = barretenberg::fr::neg(additive_constant);

        const waffle::poly_triple gate_coefficients{
            result.witness_index,
            other.witness_index,
            witness_index,
            q_m,
            q_l,
            q_r,
            q_o,
            q_c
        };
        context->create_poly_gate(gate_coefficients);
    }
    return result;    
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::normalize()
{
    field_t<ComposerContext> result(context);
    barretenberg::fr::__mul(witness, multiplicative_constant, result.witness);
    barretenberg::fr::__add(result.witness, additive_constant, result.witness);

    result.witness_index = context->add_variable(result.witness);

    const waffle::poly_triple gate_coefficients{
        witness_index,
        witness_index,
        result.witness_index,
        {{0,0,0,0}},
        multiplicative_constant,
        {{0,0,0,0}},
        barretenberg::fr::neg_one(),
        additive_constant
    };

    context->create_poly_gate(gate_coefficients);

    return result;
}
// template <typename ComposerContext>
// field_t<ComposerContext> field_t<ComposerContext>::operator/(const field_t &other)
// {
// }

}
}

#endif