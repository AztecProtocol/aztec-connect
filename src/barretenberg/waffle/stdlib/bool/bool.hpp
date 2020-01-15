#pragma once

#include "../../../curves/bn254/fr.hpp"
#include "../common.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class bool_t {
  public:
    bool_t(const bool value = false);
    bool_t(ComposerContext* parent_context);
    bool_t(ComposerContext* parent_context, const bool value);
    bool_t(const witness_t<ComposerContext>& value);
    bool_t(const bool_t& other);
    bool_t(bool_t&& other);

    bool_t& operator=(const bool other);
    bool_t& operator=(const witness_t<ComposerContext>& other);
    bool_t& operator=(const bool_t& other);
    bool_t& operator=(bool_t&& other);
    // field_t& operator=(const barretenberg::fr::field_t &value);

    // bitwise operations
    bool_t operator&(const bool_t& other) const;
    bool_t operator|(const bool_t& other) const;
    bool_t operator^(const bool_t& other) const;
    bool_t operator!() const;

    // equality checks
    bool_t operator==(const bool_t& other) const;

    bool_t operator!=(const bool_t& other) const { return operator^(other); }

    // misc bool ops
    bool_t operator~() const { return operator!(); }

    bool_t operator&&(const bool_t& other) const { return operator&(other); }

    bool_t operator||(const bool_t& other) const { return operator|(other); }

    // self ops
    void operator|=(const bool_t& other) { *this = operator|(other); }

    void operator&=(const bool_t& other) { *this = operator&(other); }

    void operator^=(const bool_t& other) { *this = operator^(other); }

    bool get_value() const { return witness_bool ^ witness_inverted; }

    bool is_constant() const { return witness_index == static_cast<uint32_t>(-1); }

    ComposerContext* context = nullptr;
    bool witness_bool = false;
    bool witness_inverted = false;
    uint32_t witness_index = static_cast<uint32_t>(-1);
};

template <typename T> inline std::ostream& operator<<(std::ostream& os, bool_t<T> const& v)
{
    return os << v.get_value();
}

} // namespace stdlib
} // namespace plonk

#include "./bool.tcc"
