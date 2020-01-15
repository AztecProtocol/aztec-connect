#pragma once

#include "../../../assert.hpp"
#include "../../../curves/bn254/fr.hpp"
#include "../../composer/composer_base.hpp"
#include "../bool/bool.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext* parent_context)
    : context(parent_context)
    , additive_constant(barretenberg::fr::zero)
    , multiplicative_constant(barretenberg::fr::one)
    , witness_index(static_cast<uint32_t>(-1))
{}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const witness_t<ComposerContext>& value)
    : context(value.context)
{
    additive_constant = barretenberg::fr::zero;
    multiplicative_constant = barretenberg::fr::one;
    witness_index = value.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(ComposerContext* parent_context, const barretenberg::fr::field_t& value)
    : context(parent_context)
{
    barretenberg::fr::__copy(value, additive_constant);
    multiplicative_constant = barretenberg::fr::zero;
    witness_index = static_cast<uint32_t>(-1);
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const uint64_t value)
    : context(nullptr)
{
    additive_constant = barretenberg::fr::to_montgomery_form({ { value, 0UL, 0UL, 0UL } });
    multiplicative_constant = barretenberg::fr::zero;
    witness_index = static_cast<uint32_t>(-1);
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(const field_t& other)
    : context(other.context)
{
    barretenberg::fr::__copy(other.additive_constant, additive_constant);
    barretenberg::fr::__copy(other.multiplicative_constant, multiplicative_constant);
    witness_index = other.witness_index;
}

template <typename ComposerContext>
field_t<ComposerContext>::field_t(field_t&& other)
    : context(other.context)
{
    barretenberg::fr::__copy(other.additive_constant, additive_constant);
    barretenberg::fr::__copy(other.multiplicative_constant, multiplicative_constant);
    witness_index = other.witness_index;
}

template <typename ComposerContext> field_t<ComposerContext>::field_t(const bool_t<ComposerContext>& other)
{
    context = (other.context == nullptr) ? nullptr : other.context;
    if (other.witness_index == static_cast<uint32_t>(-1)) {
        additive_constant =
            (other.witness_bool ^ other.witness_inverted) ? barretenberg::fr::one : barretenberg::fr::zero;
        multiplicative_constant = barretenberg::fr::one;
        witness_index = static_cast<uint32_t>(-1);
    } else {
        witness_index = other.witness_index;
        additive_constant = other.witness_inverted ? barretenberg::fr::one : barretenberg::fr::zero;
        multiplicative_constant = other.witness_inverted ? barretenberg::fr::neg_one() : barretenberg::fr::one;
    }
}

template <typename ComposerContext> field_t<ComposerContext>::operator bool_t<ComposerContext>()
{
    if (witness_index == static_cast<uint32_t>(-1)) {
        bool_t<ComposerContext> result(context);
        result.witness_bool = barretenberg::fr::eq(additive_constant, barretenberg::fr::one);
        result.witness_inverted = false;
        result.witness_index = static_cast<uint32_t>(-1);
        return result;
    }
    bool add_constant_check = barretenberg::fr::eq(additive_constant, barretenberg::fr::zero);
    bool mul_constant_check = barretenberg::fr::eq(multiplicative_constant, barretenberg::fr::one);
    bool inverted_check = barretenberg::fr::eq(additive_constant, barretenberg::fr::one) &&
                          barretenberg::fr::eq(multiplicative_constant, barretenberg::fr::neg_one());
    if ((!add_constant_check || !mul_constant_check) && !inverted_check) {
        normalize();
    }

    barretenberg::fr::field_t witness = context->get_variable(witness_index);
    ASSERT(barretenberg::fr::eq(witness, barretenberg::fr::zero) ||
           barretenberg::fr::eq(witness, barretenberg::fr::one));
    bool_t<ComposerContext> result(context);
    result.witness_bool = barretenberg::fr::eq(witness, barretenberg::fr::one);
    result.witness_inverted = inverted_check;
    result.witness_index = witness_index;
    context->create_bool_gate(witness_index);
    return result;
}

template <typename ComposerContext> field_t<ComposerContext>& field_t<ComposerContext>::operator=(const field_t& other)
{
    barretenberg::fr::__copy(other.additive_constant, additive_constant);
    barretenberg::fr::__copy(other.multiplicative_constant, multiplicative_constant);
    witness_index = other.witness_index;
    context = (other.context == nullptr ? nullptr : other.context);
    return *this;
}

template <typename ComposerContext> field_t<ComposerContext>& field_t<ComposerContext>::operator=(field_t&& other)
{
    barretenberg::fr::__copy(other.additive_constant, additive_constant);
    barretenberg::fr::__copy(other.multiplicative_constant, multiplicative_constant);
    witness_index = other.witness_index;
    context = (other.context == nullptr ? nullptr : other.context);
    return *this;
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator+(const field_t& other) const
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;
    field_t<ComposerContext> result(ctx);
    ASSERT(ctx || (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)));

    if (witness_index == other.witness_index) {
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__add(multiplicative_constant, other.multiplicative_constant, result.multiplicative_constant);
        result.witness_index = witness_index;
    } else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // both inputs are constant - don't add a gate
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
    } else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // one input is constant - don't add a gate, but update scaling factors
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__copy(multiplicative_constant, result.multiplicative_constant);
        result.witness_index = witness_index;
    } else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1)) {
        barretenberg::fr::__add(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__copy(other.multiplicative_constant, result.multiplicative_constant);
        result.witness_index = other.witness_index;
    } else {
        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t left = context->get_variable(witness_index);
        barretenberg::fr::field_t right = context->get_variable(other.witness_index);
        barretenberg::fr::field_t out;
        barretenberg::fr::__mul(left, multiplicative_constant, out);
        barretenberg::fr::__mul(right, other.multiplicative_constant, T0);
        barretenberg::fr::__add(out, T0, out);
        barretenberg::fr::__add(out, additive_constant, out);
        barretenberg::fr::__add(out, other.additive_constant, out);
        result.witness_index = ctx->add_variable(out);

        const waffle::add_triple gate_coefficients{ witness_index,
                                                    other.witness_index,
                                                    result.witness_index,
                                                    multiplicative_constant,
                                                    other.multiplicative_constant,
                                                    barretenberg::fr::neg_one(),
                                                    barretenberg::fr::add(additive_constant, other.additive_constant) };
        ctx->create_add_gate(gate_coefficients);
    }
    return result;
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator-(const field_t& other) const
{
    field_t<ComposerContext> rhs(other);
    barretenberg::fr::__neg(rhs.additive_constant, rhs.additive_constant);
    barretenberg::fr::__neg(rhs.multiplicative_constant, rhs.multiplicative_constant);
    return operator+(rhs);
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator*(const field_t& other) const
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;
    field_t<ComposerContext> result(ctx);
    ASSERT(ctx || (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)));

    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // both inputs are constant - don't add a gate
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
    } else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // one input is constant - don't add a gate, but update scaling factors
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(multiplicative_constant, other.additive_constant, result.multiplicative_constant);
        result.witness_index = witness_index;
    } else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1)) {
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(other.multiplicative_constant, additive_constant, result.multiplicative_constant);
        result.witness_index = other.witness_index;
    } else {
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

        barretenberg::fr::field_t left = context->get_variable(witness_index);
        barretenberg::fr::field_t right = context->get_variable(other.witness_index);
        barretenberg::fr::field_t out;

        barretenberg::fr::__mul(left, right, out);
        barretenberg::fr::__mul(out, q_m, out);
        barretenberg::fr::__mul(left, q_l, T0);
        barretenberg::fr::__add(out, T0, out);
        barretenberg::fr::__mul(right, q_r, T0);
        barretenberg::fr::__add(out, T0, out);
        barretenberg::fr::__add(out, q_c, out);
        result.witness_index = ctx->add_variable(out);
        const waffle::poly_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_m, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };
        ctx->create_poly_gate(gate_coefficients);
    }
    return result;
}

template <typename ComposerContext>
field_t<ComposerContext> field_t<ComposerContext>::operator/(const field_t& other) const
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;
    field_t<ComposerContext> result(ctx);
    ASSERT(ctx || (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)));

    barretenberg::fr::field_t additive_multiplier = barretenberg::fr::one;

    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // both inputs are constant - don't add a gate
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero)) {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, additive_multiplier, result.additive_constant);
    } else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1)) {
        // one input is constant - don't add a gate, but update scaling factors
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero)) {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, additive_multiplier, result.additive_constant);
        barretenberg::fr::__mul(multiplicative_constant, additive_multiplier, result.multiplicative_constant);
        result.witness_index = witness_index;
    } else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1)) {
        if (!barretenberg::fr::eq(other.additive_constant, barretenberg::fr::zero)) {
            additive_multiplier = barretenberg::fr::invert(other.additive_constant);
        }
        barretenberg::fr::__mul(additive_constant, other.additive_constant, result.additive_constant);
        barretenberg::fr::__mul(other.multiplicative_constant, additive_constant, result.multiplicative_constant);
        result.witness_index = other.witness_index;
    } else {
        barretenberg::fr::field_t left = context->get_variable(witness_index);
        barretenberg::fr::field_t right = context->get_variable(other.witness_index);
        barretenberg::fr::field_t out;

        // even if LHS is constant, if divisor is not constant we need a gate to compute the inverse
        // barretenberg::fr::field_t witness_multiplier = barretenberg::fr::invert(other.witness);
        // m1.x1 + a1 / (m2.x2 + a2) = x3
        barretenberg::fr::field_t T0;
        barretenberg::fr::__mul(multiplicative_constant, left, T0);
        barretenberg::fr::__add(T0, additive_constant, T0);
        barretenberg::fr::field_t T1;
        barretenberg::fr::__mul(other.multiplicative_constant, right, T1);
        barretenberg::fr::__add(T1, other.additive_constant, T1);

        out = barretenberg::fr::mul(T0, barretenberg::fr::invert(T1));
        result.witness_index = ctx->add_variable(out);

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
        barretenberg::fr::field_t q_r = barretenberg::fr::zero;
        barretenberg::fr::field_t q_o = barretenberg::fr::neg(multiplicative_constant);
        barretenberg::fr::field_t q_c = barretenberg::fr::neg(additive_constant);

        const waffle::poly_triple gate_coefficients{
            result.witness_index, other.witness_index, witness_index, q_m, q_l, q_r, q_o, q_c
        };
        ctx->create_poly_gate(gate_coefficients);
    }
    return result;
}

template <typename ComposerContext> field_t<ComposerContext> field_t<ComposerContext>::normalize() const
{
    if (witness_index == static_cast<uint32_t>(-1) ||
        (barretenberg::fr::eq(multiplicative_constant, barretenberg::fr::one) &&
         barretenberg::fr::eq(additive_constant, barretenberg::fr::zero))) {
        return *this;
    }

    field_t<ComposerContext> result(context);
    barretenberg::fr::field_t value = context->get_variable(witness_index);
    barretenberg::fr::field_t out;
    barretenberg::fr::__mul(value, multiplicative_constant, out);
    barretenberg::fr::__add(out, additive_constant, out);

    result.witness_index = context->add_variable(out);
    result.additive_constant = barretenberg::fr::zero;
    result.multiplicative_constant = barretenberg::fr::one;
    const waffle::add_triple gate_coefficients{ witness_index,        witness_index,
                                                result.witness_index, multiplicative_constant,
                                                { { 0, 0, 0, 0 } },   barretenberg::fr::neg_one(),
                                                additive_constant };

    context->create_add_gate(gate_coefficients);
    return result;
}

template <typename ComposerContext> barretenberg::fr::field_t field_t<ComposerContext>::get_value() const
{
    if (witness_index != static_cast<uint32_t>(-1)) {
        ASSERT(context != nullptr);
        return barretenberg::fr::add(
            barretenberg::fr::mul(multiplicative_constant, context->get_variable(witness_index)), additive_constant);
    } else {
        return additive_constant;
    }
}

template <typename ComposerContext>
bool_t<ComposerContext> field_t<ComposerContext>::operator==(const field_t& other) const
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;

    if (is_constant() && other.is_constant()) {
        return barretenberg::fr::eq(get_value(), other.get_value());
    }

    barretenberg::fr::field_t fa = get_value();
    barretenberg::fr::field_t fb = other.get_value();
    barretenberg::fr::field_t fd = barretenberg::fr::sub(fa, fb);
    bool is_equal = barretenberg::fr::eq(fa, fb);
    barretenberg::fr::field_t fc = is_equal ? barretenberg::fr::one : barretenberg::fr::invert(fd);

    bool_t result(witness_t(ctx, is_equal));
    field_t c(witness_t(ctx, fc));
    field_t d = *this - other;
    field_t test_lhs = d * c;
    field_t test_rhs = (field_t(ctx, barretenberg::fr::one) - result);
    test_rhs = test_rhs.normalize();
    ctx->assert_equal(test_lhs.witness_index, test_rhs.witness_index);

    barretenberg::fr::field_t fe = is_equal ? barretenberg::fr::one : fd;
    field_t e(witness_t(ctx, fe));

    // Ensures c is never 0.
    barretenberg::fr::field_t q_m = barretenberg::fr::one;
    barretenberg::fr::field_t q_l = barretenberg::fr::zero;
    barretenberg::fr::field_t q_r = barretenberg::fr::zero;
    barretenberg::fr::field_t q_c = barretenberg::fr::neg_one();
    barretenberg::fr::field_t q_o = barretenberg::fr::zero;
    const waffle::poly_triple gate_coefficients{
        c.witness_index, e.witness_index, c.witness_index, q_m, q_l, q_r, q_o, q_c
    };
    ctx->create_poly_gate(gate_coefficients);

    return result;
}

} // namespace stdlib
} // namespace plonk
