#pragma once

#include <vector>

#include "../../../uint256/uint256.hpp"

#include "../common.hpp"

namespace waffle
{
    class TurboComposer;
}

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class bool_t;
template <typename ComposerContext> class field_t;

template <typename Composer, size_t width> class uint {
    public:

    uint(const witness_t<Composer>& other);
    uint(Composer* composer, const uint256_t& value = 0);

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

extern template class uint<waffle::TurboComposer, 8UL>;
extern template class uint<waffle::TurboComposer, 16UL>;
extern template class uint<waffle::TurboComposer, 32UL>;
extern template class uint<waffle::TurboComposer, 64UL>;

}
}