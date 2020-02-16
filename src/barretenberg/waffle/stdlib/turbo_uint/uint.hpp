#pragma once

#include <vector>

#include "../byte_array/byte_array.hpp"
#include "../../../uint256/uint256.hpp"

#include "../common.hpp"

namespace waffle
{
    class TurboComposer;
}

namespace plonk {
namespace stdlib {

template <typename Composer> class bool_t;
template <typename Composer> class field_t;

template <typename Composer, size_t width> class uint {
    public:

    uint(const witness_t<Composer>& other);
    uint(Composer* composer, const uint256_t& value = 0);
    uint(const byte_array<Composer>& other);

    operator byte_array<Composer>() const;
    operator field_t<Composer>() const;

    uint operator+(const uint& other) const;
    uint operator-(const uint& other) const;
    uint operator*(const uint& other) const;
    uint operator/(const uint& other) const;
    uint operator%(const uint& other) const;

    uint operator&(const uint& other) const;
    uint operator^(const uint& other) const;
    uint operator|(const uint& other) const;
    uint operator~() const;

    uint operator>>(const uint64_t shift) const;
    uint operator<<(const uint64_t shift) const;

    uint ror(const uint64_t target_rotation) const;
    uint rol(const uint64_t target_rotation) const;

    bool_t<Composer> operator>(const uint& other) const;
    bool_t<Composer> operator<(const uint& other) const;
    bool_t<Composer> operator>=(const uint& other) const;
    bool_t<Composer> operator<=(const uint& other) const;
    bool_t<Composer> operator==(const uint& other) const;
    bool_t<Composer> operator!=(const uint& other) const;
    bool_t<Composer> operator!() const;

    uint operator+=(const uint& other) { *this = operator+(other); return *this; }
    uint operator-=(const uint& other) { *this = operator-(other); return *this; }
    uint operator*=(const uint& other) { *this = operator*(other); return *this; }
    uint operator/=(const uint& other) { *this = operator/(other); return *this; }
    uint operator%=(const uint& other) { *this = operator%(other); return *this; }

    uint operator&=(const uint& other) { *this = operator&(other); return *this; }
    uint operator^=(const uint& other) { *this = operator^(other); return *this; }
    uint operator|=(const uint& other) { *this = operator|(other); return *this; }

    uint operator>>=(const uint64_t shift) { *this = operator>>(shift); return *this; }
    uint operator<<=(const uint64_t shift) { *this = operator<<(shift); return *this; }

    uint normalize() const;

    uint256_t get_value() const;

    bool is_constant() const { return witness_index == UINT32_MAX; }

protected:
    Composer* context;

    enum WitnessStatus {
        OK,
        NOT_NORMALIZED,
        WEAK_NORMALIZED
    };

    mutable uint256_t additive_constant;
    mutable WitnessStatus witness_status;
    mutable std::vector<uint32_t> accumulators;
    mutable uint32_t witness_index;

    static constexpr uint256_t CIRCUIT_UINT_MAX_PLUS_ONE = (uint256_t(1) << width);
    static constexpr uint256_t MASK = CIRCUIT_UINT_MAX_PLUS_ONE - 1;
private:
    enum LogicOp{
        AND,
        XOR,
    };
    
    std::pair<uint, uint> divmod(const uint& other) const;
    uint logic_operator(const uint& other, const LogicOp op_type) const;
    uint weak_normalize() const;

    uint256_t get_unbounded_value() const;
};

template <typename T, size_t w> inline std::ostream& operator<<(std::ostream& os, uint<T, w> const& v)
{
    return os << v.get_value();
}

extern template class uint<waffle::TurboComposer, 8UL>;
extern template class uint<waffle::TurboComposer, 16UL>;
extern template class uint<waffle::TurboComposer, 32UL>;
extern template class uint<waffle::TurboComposer, 64UL>;

}
}