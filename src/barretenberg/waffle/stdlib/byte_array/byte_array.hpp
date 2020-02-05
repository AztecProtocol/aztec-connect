#pragma once

#include <string>
#include <vector>

#include "../bool/bool.hpp"
#include "../common.hpp"
#include "../uint32/uint32.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class byte_array {
  public:
    typedef std::vector<bool_t<ComposerContext>> bits_t;

    byte_array(ComposerContext* parent_context);
    byte_array(ComposerContext* parent_context, size_t const n);
    byte_array(ComposerContext* parent_context, std::string const& input);
    byte_array(ComposerContext* parent_context, bits_t const& input);
    byte_array(ComposerContext* parent_context, bits_t&& input);

    byte_array(const byte_array& other);
    byte_array(byte_array&& other);

    byte_array& operator=(const byte_array& other);
    byte_array& operator=(byte_array&& other);

    void write(byte_array const& other);

    byte_array slice(size_t offset) const;
    byte_array slice(size_t offset, size_t length) const;

    size_t size() const { return values.size() / 8; }

    bits_t const& bits() const { return values; }

    ComposerContext* get_context() const { return context; }

  private:
    ComposerContext* context;
    bits_t values;
};

} // namespace stdlib
} // namespace plonk

#include "./byte_array.tcc"