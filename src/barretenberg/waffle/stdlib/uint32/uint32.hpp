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

    uint32 operator+(uint32 &other);
    uint32 operator-(uint32 &other);
    uint32 operator*(uint32 &other);
    uint32 operator/(uint32 &other);
    uint32 operator%(uint32 &other);

    uint32 operator&(uint32 &other);
    uint32 operator|(uint32 &other);
    uint32 operator^(uint32 &other);
    uint32 operator~();

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

    field_t<ComposerContext> field_wires[32];
    field_t<ComposerContext> accumulators[32];

    static constexpr size_t MAXIMUM_BIT_LENGTH = 110UL; // (2x + 33 = 253 => 2x = 220 => x = 110)
    const barretenberg::fr::field_t uint32_max = barretenberg::fr::pow_small(barretenberg::fr::add(barretenberg::fr::one(), barretenberg::fr::one()), 32);
};
}
}

#include "./uint32.tcc"
#endif