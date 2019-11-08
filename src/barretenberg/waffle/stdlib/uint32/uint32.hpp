#ifndef STDLIB_UINT32
#define STDLIB_UINT32

#include "../common.hpp"

#include "../../../fields/fr.hpp"
#include "../../../assert.hpp"

#include "../bool/bool.hpp"
#include "../field/field.hpp"

namespace plonk
{
namespace stdlib
{
template <typename ComposerContext>
class uint32
{
public:
    enum WitnessStatus
    {
        OK,
        NOT_NORMALIZED,
        IN_BINARY_FORM
    };

    uint32();
    uint32(ComposerContext *parent_context);
    uint32(const witness_t<ComposerContext> &value);
    uint32(ComposerContext *parent_context, const uint32_t value);

    uint32(const field_t<ComposerContext> &other);
    uint32(const uint32 &other);
    uint32(uint32 &&other);
    
    operator field_t<ComposerContext> ();

    uint32 & operator=(const uint32 &other);
    uint32 & operator=(uint32 &&other);
    uint32 & operator=(const uint32_t value);
    uint32 & operator=(const witness_t<ComposerContext> &value);

    ~uint32() {};

    void prepare_for_arithmetic_operations();
    void prepare_for_logic_operations();

    // TODO: change the naming scheme for this
    // 'concatenate' will use + gates to create a witness out of boolean 'field wires'
    // 'decompose' will use + and bool gates to create boolean 'field wires' from a witness
    void concatenate();
    void decompose();
    void normalize(); // ensures uint32 both has valid binary wires and a valid witness

    uint32 operator+(uint32 &other);
    uint32 operator-(uint32 &other);
    uint32 operator*(uint32 &other);
    uint32 operator/(uint32 &other);
    uint32 operator%(uint32 &other);

    // We need to define separate methods that accept rvalue references. When working with lvalue's, we don't want the input
    // argument to be const, because if we need to decompose a uint32 into binary wires (or concatenate binary wires into a sum),
    // we want to ensure that this is only performed once per unique operand.
    // For example, imagine we have a uint32 `a`, that is in a NOT_NORMALIZED state as it has been composed out of a `+` operator.
    // If we have two statements: `uint32 c = foo ^ a; uint32 d = bar & a`, then to compute `c`, we need to split out `a` into its
    // individual binary wires. We also need to do this to compute d - so we want to be able to mutate the operand of any operator call.
    // Now, when computing `uint32 c = foo ^ a`, we add a side-effect that splits `a` into binary wires. When computing 
    // `uint32 d = bar & a`, `a` is correctly formatted, and we can avoid repeating the binary decomposition.
    // However! This means that rvalue references cannot be used as operands. e.g. `uint32 foo = bar ^ baz ^ faz`,
    // (baz ^ faz) is a temporary rvalue, that the compiler cannot convert to a non-const lvalue. This is because any non-const
    // side effects are going to be discarded. However! In our context, this is absolutely fine, the non-const-ness of the operand
    // is purely for efficiency reasons - it is absolutely fine for a 'mutated' operand to be discarded as the side-effect exists purely
    // to reduce the number of constraints in the composer circuit. I.e. the 'state' that is represented by the rvalue does not change,
    // only how it is represented.
    // TLDR: we need to overload our operators to take rvalue references, and use the copy constructor to force them into lvalues,
    // before feeding them into the original operator method. Bleurgh.
    uint32 operator+(uint32 &&other) { return operator+(other); }
    uint32 operator-(uint32 &&other) { return operator-(other); }
    uint32 operator*(uint32 &&other) { return operator*(other); }
    uint32 operator/(uint32 &&other) { return operator/(other); }
    uint32 operator%(uint32 &&other) { return operator%(other); }

    uint32 operator&(uint32 &other);
    uint32 operator|(uint32 &other);
    uint32 operator^(uint32 &other);
    uint32 operator~();

    uint32 operator&(uint32 &&other) { return operator&(other); }
    uint32 operator|(uint32 &&other) { return operator|(other); }
    uint32 operator^(uint32 &&other) { return operator^(other); }

    uint32 operator>>(const uint32_t const_shift);
    uint32 operator<<(const uint32_t const_shift);

    uint32 ror(const uint32_t const_rotation);
    uint32 rol(const uint32_t const_rotation);

    bool_t<ComposerContext> operator>(uint32 &other);
    bool_t<ComposerContext> operator<(uint32 &other);
    bool_t<ComposerContext> operator>=(uint32 &other);
    bool_t<ComposerContext> operator<=(uint32 &other);
    bool_t<ComposerContext> operator==(uint32 &other);
    bool_t<ComposerContext> operator!=(uint32 &other);

    uint32 operator++();
    uint32 operator--();

    uint32 operator+=(uint32 &other);
    uint32 operator-=(uint32 &other);
    uint32 operator*=(uint32 &other);
    uint32 operator/=(uint32 &other);
    uint32 operator%=(uint32 &other);

    uint32 operator&=(uint32 &other);
    uint32 operator^=(uint32 &other);
    uint32 operator|=(uint32 &other);

    uint32 operator>>=(uint32 &other);
    uint32 operator<<=(uint32 &other);

    uint32 ternary_operator(const bool_t<ComposerContext> &predicate, const uint32 &lhs, const uint32 &rhs);

    ComposerContext *context;
    barretenberg::fr::field_t witness;
    uint32_t witness_index;

    uint32_t additive_constant;
    uint32_t multiplicative_constant;

    WitnessStatus witness_status;
    size_t num_witness_bits;

    bool_t<ComposerContext> field_wires[32];
    field_t<ComposerContext> accumulators[32];

    static constexpr size_t MAXIMUM_BIT_LENGTH = 110UL; // (2x + 33 = 253 => 2x = 220 => x = 110)
    const barretenberg::fr::field_t uint32_max = barretenberg::fr::pow_small(barretenberg::fr::add(barretenberg::fr::one(), barretenberg::fr::one()), 32);
};
}
}

#include "./uint32.tcc"
#endif