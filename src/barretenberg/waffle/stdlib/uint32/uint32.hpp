#ifndef STDLIB_UINT32
#define STDLIB_UINT32

#include "../common.hpp"

#include "../../../assert.hpp"
#include "../../../fields/fr.hpp"

#include "../bool/bool.hpp"
#include "../field/field.hpp"
#include <array>

namespace plonk {
namespace stdlib {
template <typename ComposerContext> class uint32 {
  public:
    uint32();
    uint32(ComposerContext* parent_context);
    uint32(const witness_t<ComposerContext>& value);
    uint32(ComposerContext* parent_context, const uint32_t value);
    uint32(const field_t<ComposerContext>& other);
    uint32(const uint32& other);
    uint32(uint32&& other);

    ~uint32(){};

    operator field_t<ComposerContext>();

    uint32& operator=(const uint32& other);
    uint32& operator=(const uint32_t value);
    uint32& operator=(const witness_t<ComposerContext>& value);

    uint32 operator+(const uint32& other);
    uint32 operator-(const uint32& other) const;
    uint32 operator*(const uint32& other) const;
    uint32 operator/(const uint32& other);
    uint32 operator%(const uint32& other);
    uint32 operator&(const uint32& other) const;
    uint32 operator|(const uint32& other) const;
    uint32 operator^(const uint32& other) const;
    uint32 operator~();

    uint32 operator>>(const uint32_t const_shift);
    uint32 operator<<(const uint32_t const_shift);

    uint32 ror(const uint32_t const_rotation);
    uint32 rol(const uint32_t const_rotation);

    bool_t<ComposerContext> operator>(const uint32& other) const;
    bool_t<ComposerContext> operator<(const uint32& other) const;
    bool_t<ComposerContext> operator>=(const uint32& other) const;
    bool_t<ComposerContext> operator<=(const uint32& other) const;
    bool_t<ComposerContext> operator==(const uint32& other) const;
    bool_t<ComposerContext> operator!=(const uint32& other) const;

    uint32 operator++() { return operator+(uint32(context, barretenberg::fr::one())); };
    uint32 operator--() { return operator-(uint32(context, barretenberg::fr::one())); };

    uint32 operator+=(const uint32& other) { *this = operator+(other); };
    uint32 operator-=(const uint32& other) { *this = operator-(other); };
    uint32 operator*=(const uint32& other) { *this = operator*(other); };
    uint32 operator/=(const uint32& other) { *this = operator/(other); };
    uint32 operator%=(const uint32& other) { *this = operator%(other); };

    uint32 operator&=(const uint32& other) { *this = operator&(other); };
    uint32 operator^=(const uint32& other) { *this = operator^(other); };
    uint32 operator|=(const uint32& other) { *this = operator|(other); };

    uint32 operator>>=(const uint32& other) { *this = operator>>(other); };
    uint32 operator<<=(const uint32& other) { *this = operator<<(other); };

    uint32_t get_witness_index()
    {
        normalize();
        return witness_index;
    }

  private:
    enum WitnessStatus { OK, NOT_NORMALIZED, IN_BINARY_FORM };

    void prepare_for_arithmetic_operations() const;
    void prepare_for_logic_operations() const;

    // TODO: change the naming scheme for this
    // 'concatenate' will use + gates to create a witness out of boolean 'field wires'
    // 'decompose' will use + and bool gates to create boolean 'field wires' from a witness
    void concatenate() const;
    void decompose() const;
    void normalize(); // ensures uint32 both has valid binary wires and a valid witness

    uint32<ComposerContext> internal_logic_operation(
        const uint32<ComposerContext>& right,
        bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>, bool_t<ComposerContext>)) const;

    uint32 ternary_operator(const bool_t<ComposerContext>& predicate, const uint32& lhs, const uint32& rhs);

    ComposerContext* context;
    mutable barretenberg::fr::field_t witness;
    mutable uint32_t witness_index;

    mutable uint32_t additive_constant;
    mutable uint32_t multiplicative_constant;

    mutable WitnessStatus witness_status;
    mutable size_t num_witness_bits;

    mutable std::array<bool_t<ComposerContext>, 32> field_wires;
    mutable std::array<field_t<ComposerContext>, 32> accumulators;

    static constexpr size_t MAXIMUM_BIT_LENGTH = 110UL; // (2x + 33 = 253 => 2x = 220 => x = 110)
    const barretenberg::fr::field_t uint32_max =
        barretenberg::fr::pow_small(barretenberg::fr::add(barretenberg::fr::one(), barretenberg::fr::one()), 32);
};

template <typename T> inline std::ostream& operator<<(std::ostream& os, uint32<T> const&)
{
    return os << "implement me";
}

} // namespace stdlib
} // namespace plonk

#include "./uint32.tcc"
#endif