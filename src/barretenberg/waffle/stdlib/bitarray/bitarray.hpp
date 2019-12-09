#pragma once

#include "../bool/bool.hpp"
#include "../common.hpp"

#include <vector>
#include <string>

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
class bitarray
{
public:
    bitarray(ComposerContext *parent_context, const size_t n);
    bitarray(ComposerContext *parent_context, const std::string &input);
    bitarray(const std::vector<uint32<ComposerContext> > &input);

    template <size_t N>
    bitarray(const std::array<uint32<ComposerContext>, N> &input);

    bitarray(const bitarray &other);
    bitarray(bitarray &&other);

    bitarray &operator=(const bitarray &other);
    bitarray &operator=(bitarray &&other);

    bool_t<ComposerContext> &operator[](const size_t idx);
    bool_t<ComposerContext> operator[](const size_t idx) const;

    template <size_t N>
    operator std::array<uint32<ComposerContext>, N> ();

    std::vector<uint32<ComposerContext> > to_uint32_vector();

    template <size_t N>
    void populate_uint32_array(const size_t starting_index, std::array<uint32<ComposerContext>, N> &output);

    std::string get_witness_as_string() const;

    size_t size() const { return length; }

    ComposerContext * get_context() const { return context; }

    void print() const
    {
        size_t num_ulongs = (length / 32) + (length % 32 != 0);
        std::vector<uint32_t> ulong_vector(num_ulongs, 0);
        for (size_t i = 0; i < length; ++i)
        {
            size_t ulong_index = i / 32;
            uint32_t shift = static_cast<uint32_t>(i - (ulong_index * 32));
            ulong_vector[num_ulongs - 1 - ulong_index] = ulong_vector[num_ulongs - 1 - ulong_index] + (static_cast<uint32_t>(values[i].get_value()) << shift);
        }
        printf("[");
        for (size_t i = 0; i < num_ulongs; ++i)
        {
            printf(" %x", (ulong_vector[i]));
        }
        printf(" ]\n");
    }
private:
    ComposerContext *context;
    size_t length;
    std::vector<bool_t<ComposerContext> > values;
};
}
}

#include "./bitarray.tcc"