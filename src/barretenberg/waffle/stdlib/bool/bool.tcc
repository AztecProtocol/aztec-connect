#ifndef PLONK_BOOL_TCC
#define PLONK_BOOL_TCC

#include "./bool.hpp"

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t()
    : context(nullptr)
    , witness(barretenberg::fr::zero())
    , witness_bool(false)
    , witness_inverted(false)
    , witness_index(static_cast<uint32_t>(-1))
{
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext* parent_context) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    witness = barretenberg::fr::zero();
    witness_bool = false;
    witness_inverted = false;
    witness_index = static_cast<uint32_t>(-1);
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(const witness_t<ComposerContext>& value) : context(value.context)
{
    ASSERT(context != nullptr);
    ASSERT(barretenberg::fr::eq(value.witness, barretenberg::fr::zero()) ||
           barretenberg::fr::eq(value.witness, barretenberg::fr::one()));
    witness_index = value.witness_index;
    context->create_bool_gate(witness_index);
    barretenberg::fr::copy(value.witness, witness);
    witness_bool = barretenberg::fr::eq(value.witness, barretenberg::fr::one());
    witness_inverted = false;
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext* parent_context, const bool value) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    context = parent_context;
    witness_index = static_cast<uint32_t>(-1);
    witness_bool = value;
    witness = witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    witness_inverted = false;
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(const bool_t<ComposerContext>& other) : context(other.context)
{
    ASSERT(other.context != nullptr);
    witness_index = other.witness_index;
    witness_bool = other.witness_bool;
    witness_inverted = other.witness_inverted;
    witness = other.witness;
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(bool_t<ComposerContext>&& other) : context(other.context)
{
    ASSERT(other.context != nullptr);
    witness_index = other.witness_index;
    witness_bool = other.witness_bool;
    witness_inverted = other.witness_inverted;
    witness = other.witness;
}

template <typename ComposerContext> bool_t<ComposerContext>& bool_t<ComposerContext>::operator=(const bool other)
{
    witness_index = static_cast<uint32_t>(-1);
    witness_bool = other;
    witness = witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    witness_inverted = false;
    return *this;
}

template <typename ComposerContext> bool_t<ComposerContext>& bool_t<ComposerContext>::operator=(const bool_t& other)
{
    ASSERT(other.context != nullptr);
    context = other.context;
    witness_index = other.witness_index;
    witness_bool = other.witness_bool;
    witness_inverted = other.witness_inverted;
    witness = other.witness;
    return *this;
}

template <typename ComposerContext> bool_t<ComposerContext>& bool_t<ComposerContext>::operator=(bool_t&& other)
{
    ASSERT(other.context != nullptr);
    context = other.context;
    witness_index = other.witness_index;
    witness_bool = other.witness_bool;
    witness_inverted = other.witness_inverted;
    witness = other.witness;
    return *this;
}

template <typename ComposerContext>
bool_t<ComposerContext>& bool_t<ComposerContext>::operator=(const witness_t<ComposerContext>& other)
{
    ASSERT(barretenberg::fr::eq(other.witness, barretenberg::fr::one()) ||
           barretenberg::fr::eq(other.witness, barretenberg::fr::zero()));
    context = other.context;
    witness_bool = barretenberg::fr::eq(other.witness, barretenberg::fr::zero()) ? false : true;
    witness = other.witness;
    witness_index = other.witness_index;
    witness_inverted = false;
    context->create_bool_gate(witness_index);
    return *this;
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator&(const bool_t& other) const
{
    ASSERT(context == other.context || (context == nullptr && other.context != nullptr) ||
           (context != nullptr && other.context == nullptr));
    bool_t<ComposerContext> result(context == nullptr ? other.context : context);
    bool left = witness_inverted ^ witness_bool;
    bool right = other.witness_inverted ^ other.witness_bool;

    if (witness_index != static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        result.witness_bool = left & right;
        result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
        result.witness_index = context->add_variable(result.witness);
        result.witness_inverted = false;
        // (a.b)
        // (b.(1-a))
        // (a.(1-b))
        // (1-a).(1-b)
        const waffle::poly_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            (witness_inverted ^ other.witness_inverted) ? barretenberg::fr::neg_one() : barretenberg::fr::one(),
            other.witness_inverted ? barretenberg::fr::one() : barretenberg::fr::zero(),
            witness_inverted ? barretenberg::fr::one() : barretenberg::fr::zero(),
            barretenberg::fr::neg_one(),
            (witness_inverted & other.witness_inverted) ? barretenberg::fr::one() : barretenberg::fr::zero()
        };
        context->create_poly_gate(gate_coefficients);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        if (other.witness_bool && !other.witness_inverted)
        {
            result = bool_t<ComposerContext>(*this);
        }
        else
        {
            result.witness_bool = false;
            result.witness = barretenberg::fr::zero();
            result.witness_inverted = false;
            result.witness_index = static_cast<uint32_t>(-1);
        }
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        if (witness_bool && !witness_inverted)
        {
            result = bool_t<ComposerContext>(other);
        }
        else
        {
            result.witness_bool = false;
            result.witness = barretenberg::fr::zero();
            result.witness_inverted = false;
            result.witness_index = static_cast<uint32_t>(-1);
        }
    }
    else
    {
        result.witness_bool = left & right;
        result.witness_inverted = false;
        result.witness_index = static_cast<uint32_t>(-1);
        result.witness_inverted = false;
    }
    return result;
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator|(const bool_t& other) const
{
    ASSERT(context == other.context || (context == nullptr && other.context != nullptr) ||
           (context != nullptr && other.context == nullptr));
    bool_t<ComposerContext> result(context == nullptr ? other.context : context);

    result.witness_bool = (witness_bool ^ witness_inverted) | (other.witness_bool ^ other.witness_inverted);
    result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    result.witness_inverted = false;
    if ((other.witness_index != static_cast<uint32_t>(-1)) && (witness_index != static_cast<uint32_t>(-1)))
    {
        result.witness_index = context->add_variable(result.witness);
        // result = a + b - ab
        // (1 - a) + (1 - b) - (1 - a)(1 - b) = 2 - a - b - ab - 1 + a + b = 1 - ab
        // (1 - a) + b - (1 - a)(b) = 1 - a + b - b +ab = 1 - a + ab
        // a + (1 - b) - (a)(1 - b) = a - b + ab - a + 1 = 1 - b + ab
        barretenberg::fr::field_t multiplicative_coefficient;
        barretenberg::fr::field_t left_coefficient;
        barretenberg::fr::field_t right_coefficient;
        barretenberg::fr::field_t constant_coefficient;
        if (witness_inverted && !other.witness_inverted)
        {
            multiplicative_coefficient = barretenberg::fr::one();
            left_coefficient = barretenberg::fr::neg_one();
            right_coefficient = barretenberg::fr::zero();
            constant_coefficient = barretenberg::fr::one();
        }
        else if (!witness_inverted && other.witness_inverted)
        {
            multiplicative_coefficient = barretenberg::fr::one();
            left_coefficient = barretenberg::fr::zero();
            right_coefficient = barretenberg::fr::neg_one();
            constant_coefficient = barretenberg::fr::one();
        }
        else if (witness_inverted && other.witness_inverted)
        {
            multiplicative_coefficient = barretenberg::fr::neg_one();
            left_coefficient = barretenberg::fr::zero();
            right_coefficient = barretenberg::fr::zero();
            constant_coefficient = barretenberg::fr::one();
        }
        else
        {
            multiplicative_coefficient = barretenberg::fr::neg_one();
            left_coefficient = barretenberg::fr::one();
            right_coefficient = barretenberg::fr::one();
            constant_coefficient = barretenberg::fr::zero();
        }
        const waffle::poly_triple gate_coefficients{
            witness_index,    other.witness_index, result.witness_index,        multiplicative_coefficient,
            left_coefficient, right_coefficient,   barretenberg::fr::neg_one(), constant_coefficient
        };
        context->create_poly_gate(gate_coefficients);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        if (other.witness_bool ^ other.witness_inverted)
        {
            result.witness_index = static_cast<uint32_t>(-1);
            result.witness_bool = true;
            result.witness = barretenberg::fr::one();
            result.witness_inverted = false;
        }
        else
        {
            result = bool_t<ComposerContext>(*this);
        }
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        if (witness_bool ^ witness_inverted)
        {
            result.witness_index = static_cast<uint32_t>(-1);
            result.witness_bool = true;
            result.witness = barretenberg::fr::one();
            result.witness_inverted = false;
        }
        else
        {
            result = bool_t<ComposerContext>(other);
        }
    }
    else
    {
        result.witness_inverted = false;
        result.witness_index = static_cast<uint32_t>(-1);
    }
    return result;
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator^(const bool_t& other) const
{
    ASSERT(context == other.context || (context == nullptr && other.context != nullptr) ||
           (context != nullptr && other.context == nullptr));
    bool_t<ComposerContext> result(context == nullptr ? other.context : context);

    result.witness_bool = (witness_bool ^ witness_inverted) ^ (other.witness_bool ^ other.witness_inverted);
    result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    result.witness_inverted = false;
    if ((other.witness_index != static_cast<uint32_t>(-1)) && (witness_index != static_cast<uint32_t>(-1)))
    {
        result.witness_index = context->add_variable(result.witness);
        // norm a, norm b: a + b - 2ab
        // inv  a, norm b: (1 - a) + b - 2(1 - a)b = 1 - a - b + 2ab
        // norm a, inv  b: a + (1 - b) - 2(a)(1 - b) = 1 - a - b + 2ab
        // inv  a, inv  b: (1 - a) + (1 - b) - 2(1 - a)(1 - b) = a + b - 2ab
        barretenberg::fr::field_t multiplicative_coefficient;
        barretenberg::fr::field_t left_coefficient;
        barretenberg::fr::field_t right_coefficient;
        barretenberg::fr::field_t constant_coefficient;
        if ((witness_inverted && other.witness_inverted) || (!witness_inverted && !other.witness_inverted))
        {
            multiplicative_coefficient =
                barretenberg::fr::add(barretenberg::fr::neg_one(), barretenberg::fr::neg_one());
            left_coefficient = barretenberg::fr::one();
            right_coefficient = barretenberg::fr::one();
            constant_coefficient = barretenberg::fr::zero();
        }
        else
        {
            multiplicative_coefficient = barretenberg::fr::add(barretenberg::fr::one(), barretenberg::fr::one());
            left_coefficient = barretenberg::fr::neg_one();
            right_coefficient = barretenberg::fr::neg_one();
            constant_coefficient = barretenberg::fr::one();
        }
        const waffle::poly_triple gate_coefficients{
            witness_index,    other.witness_index, result.witness_index,        multiplicative_coefficient,
            left_coefficient, right_coefficient,   barretenberg::fr::neg_one(), constant_coefficient
        };
        context->create_poly_gate(gate_coefficients);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        // witness ^ 1 = (witness = 0)
        if (other.witness_bool ^ other.witness_inverted)
        {
            result.witness_index = static_cast<uint32_t>(-1);
            result.witness_bool = false;
            result.witness = barretenberg::fr::zero();
            result.witness_inverted = false;
        }
        else
        {
            result = bool_t<ComposerContext>(*this);
        }
    }
    else if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        if (witness_bool ^ witness_inverted)
        {
            result.witness_index = static_cast<uint32_t>(-1);
            result.witness_bool = false;
            result.witness = barretenberg::fr::zero();
            result.witness_inverted = false;
        }
        else
        {
            result = bool_t<ComposerContext>(other);
        }
    }
    else
    {
        result.witness_inverted = false;
        result.witness_index = static_cast<uint32_t>(-1);
    }
    return result;
}

template <typename ComposerContext> bool_t<ComposerContext> bool_t<ComposerContext>::operator!() const
{
    bool_t<ComposerContext> result(*this);
    result.witness_inverted = !result.witness_inverted;
    return result;
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator==(const bool_t& other) const
{
    ASSERT(context == other.context || (context == nullptr && other.context != nullptr) ||
           (context != nullptr && other.context == nullptr));
    if ((other.witness_index == static_cast<uint32_t>(-1)) && (witness_index == static_cast<uint32_t>(-1)))
    {
        bool_t<ComposerContext> result(context == nullptr ? other.context : context);
        result.witness_bool = (witness_bool ^ witness_inverted) == (other.witness_bool ^ other.witness_inverted);
        result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
        result.witness_index = static_cast<uint32_t>(-1);
        return result;
    }
    else if ((witness_index != static_cast<uint32_t>(-1)) && (other.witness_index == static_cast<uint32_t>(-1)))
    {
        if (other.witness_bool ^ other.witness_inverted)
        {
            return (*this);
        }
        else
        {
            return !(*this);
        }
    }
    else if ((witness_index == static_cast<uint32_t>(-1)) && (other.witness_index != static_cast<uint32_t>(-1)))
    {
        if (witness_bool ^ witness_inverted)
        {
            return other;
        }
        else
        {
            return !(other);
        }
    }
    else
    {
        bool_t<ComposerContext> result(context == nullptr ? other.context : context);
        result.witness_bool = (witness_bool ^ witness_inverted) == (other.witness_bool ^ other.witness_inverted);
        result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
        result.witness_index = context->add_variable(result.witness);
        // norm a, norm b or both inv: 1 - a - b + 2ab
        // inv a or inv b = a + b - 2ab
        barretenberg::fr::field_t multiplicative_coefficient;
        barretenberg::fr::field_t left_coefficient;
        barretenberg::fr::field_t right_coefficient;
        barretenberg::fr::field_t constant_coefficient;
        if ((witness_inverted && other.witness_inverted) || (!witness_inverted && !other.witness_inverted))
        {
            multiplicative_coefficient = barretenberg::fr::add(barretenberg::fr::one(), barretenberg::fr::one());
            left_coefficient = barretenberg::fr::neg_one();
            right_coefficient = barretenberg::fr::neg_one();
            constant_coefficient = barretenberg::fr::one();
        }
        else
        {
            multiplicative_coefficient =
                barretenberg::fr::add(barretenberg::fr::neg_one(), barretenberg::fr::neg_one());
            left_coefficient = barretenberg::fr::one();
            right_coefficient = barretenberg::fr::one();
            constant_coefficient = barretenberg::fr::zero();
        }
        const waffle::poly_triple gate_coefficients{
            witness_index,    other.witness_index, result.witness_index,        multiplicative_coefficient,
            left_coefficient, right_coefficient,   barretenberg::fr::neg_one(), constant_coefficient
        };
        context->create_poly_gate(gate_coefficients);
        return result;
    }
}

} // namespace stdlib
} // namespace plonk

#endif