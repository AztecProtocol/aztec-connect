#ifndef PLONK_BOOL_TCC
#define PLONK_BOOL_TCC

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    witness = barretenberg::fr::zero();
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context, const witness_t &value) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    ASSERT(barretenberg::fr::eq(value.witness, barretenberg::fr::zero()) || barretenberg::fr::eq(value.witness, barretenberg::fr::one()));
    witness_index = context->add_variable(witness);
    context->create_bool_gate(witness_index);
    barretenberg::fr::copy(value.witness, witness);
    witness_bool = barretenberg::fr::eq(value.witness, barretenberg::fr::one());
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context, const bool value) : context(parent_context)
{
    
}


template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator&(const bool_t &other)
{
    ASSERT(context == other.context);
    bool_t<ComposerContext> result(other);
    bool left = witness_inverted ^ witness_bool;
    bool right = other.witness_inverted ^ other.witness_bool;

    if (witness_index != static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        result.witness_bool = left & right;
        result.witness = result.witness_bool ? fr::one() : fr::zero();
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
            (witness_inverted ^ other.witness_inverted) ? fr::neg_one() : fr::one(),
            witness_inverted ? fr::neg_one() : fr::zero(),
            other.witness_inverted ? fr::neg_one() : fr::zero(),
            fr::neg_one(),
            (witness_inverted & other.witness_inverted) ? fr::one() : fr::zero()
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
            result.witness = fr::zero();
            result.witness_inverted = false;
            result.witness_index = static_cast<uint32_t>(-1);
        }
    }
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index != static_cast<uint32_t>(-1))
    {
        if (witness_bool && !witness_inverted)
        {
            result = bool_t<ComposerContext>(other);
        }
        else
        {
            result.witness_bool = false;
            result.witness = fr::zero();
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
bool_t<ComposerContext> bool_t<ComposerContext>::operator|(const bool_t &other)
{
    ASSERT(context == other.context);
    bool_t<ComposerContext> result;
    result.witness_bool = witness_bool | other.witness_bool;
    result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    result.witness_inverted = false;
    if ((other.witness_index != static_cast<uint32_t>(-1))  && (witness_index != static_cast<uint32_t>(-1)))
    {
        result.witness_index = context->add_variable(result);
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
        else if (!witness_inverted && !other.witness_inverted)
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
            witness_index,
            other.witness_index,
            result.witness_index,
            multiplicative_coefficient,
            left_coefficient,
            right_coefficient,
            barretenberg::fr::neg_one(),
            constant_coefficient
        };
        context->create_poly_gate(gate_coefficients);
    }
    else if (witness_index != static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        if (other.witness_bool ^ other.witness_inverted)
        {
            result.witness_index = static_cast<uint32_t>(-1);
            result.witness_bool = true;
            result.witness = fr::one();
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
            result.witness = fr::one();
            result.witness_inverted = false;   
        }
        else
        {
            result = bool_t<ComposerContext>(other);
        }
    }
    else if (other.witness_index != static_cast<uint32_t>(-1) || (witness_index != static_cast<uint32_t>(-1)))
    {
        result.witness_index = constext->add_variable(result);
    } 
    return result;
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator|(const bool_t &other)
{
    ASSERT(context == other.context);
    bool_t<ComposerContext> result;
    result.witness_bool = witness_bool ^ other.witness_bool;
    result.witness = result.witness_bool ? barretenberg::fr::one() : barretenberg::fr::zero();
    if ((other.witness_index != static_cast<uint32_t>(-1))  && (witness_index != static_cast<uint32_t>(-1)))
    {
        // result = a + b - 2ab
        result.witness_index = context->add_variable(result);
        const waffle::poly_triple gate_coefficients{
            witness_index,
            other.witness_index,
            result.witness_index,
            barretenberg::fr::add(barretenberg::fr::neg_one(), barretenberg::fr::neg_one()),
            barretenberg::fr::one(),
            barretenberg::fr::one(),
            barretenberg::fr::neg_one(),
            barretenberg::fr::zero()
        };
        context->create_poly_gate(gate_coefficients);
    }
    else if (other.witness_index != static_cast<uint32_t>(-1) || (witness_index != static_cast<uint32_t>(-1)))
    {
        result.witness_index = constext->add_variable(result);
    }
    return result;
    // a + b - ab  
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator!(const bool_t &other)
{

}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator*(const bool_t &other)
{
    return operator&(other);
}

template <typename ComposerContext>
bool_t<ComposerContext> bool_t<ComposerContext>::operator+(const bool_t &other)
{
    return operator^(other);
}
{

}
}
}