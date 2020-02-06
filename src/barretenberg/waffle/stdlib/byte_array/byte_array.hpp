#pragma once

#include <string>
#include <vector>

#include "../bool/bool.hpp"
#include "../common.hpp"

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

    bool_t<ComposerContext> const& get_bit(size_t index) const { return values[values.size() - index - 1]; }

    ComposerContext* get_context() const { return context; }

    void print() const
    {
        size_t length = values.size();
        size_t num = (length / 8) + (length % 8 != 0);
        std::vector<uint8_t> bytes(num, 0);
        for (size_t i = 0; i < length; ++i) {
            size_t index = i / 8;
            uint8_t shift = static_cast<uint8_t>(7 - (i - index * 8));
            bytes[index] |= (uint8_t)values[i].get_value() << shift;
        }
        printf("[");
        for (size_t i = 0; i < num; ++i) {
            printf(" %02x", bytes[i]);
        }
        printf(" ]\n");
    }

  private:
    ComposerContext* context;
    bits_t values;
};

} // namespace stdlib
} // namespace plonk

#include "./byte_array.tcc"