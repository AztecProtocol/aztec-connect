#pragma once

#include <algorithm>
#include <bitset>
#include <string>

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
bitarray<ComposerContext>::bitarray(ComposerContext* parent_context, const size_t n)
    : context(parent_context), length(n), values(std::vector<bool_t<ComposerContext>>(n))
{
}

template <typename ComposerContext>
bitarray<ComposerContext>::bitarray(ComposerContext* parent_context, const std::string& input) : context(parent_context)
{
    length = input.length() * 8;
    values.resize(length);

    for (size_t i = 0; i < input.size(); ++i)
    {
        char c = input[i];
        std::bitset<8> char_bits = std::bitset<8>(static_cast<unsigned long long>(c));
        // order chars in our buffer, so that 1st char = most significant
        size_t position = length - (8 * (i + 1));
        for (size_t j = 0; j < 8; ++j)
        {
            // printf("bit [%lu][%lu] = %u\n", i, j, char_bits[j] == true ? 1 : 0);
            witness_t<ComposerContext> value(context, char_bits[j]);
            values[position + j] = value;
        }
    }
    // for (const char &c : input)
    // {
    //     std::bitset<8> char_bits = std::bitset<8>(static_cast<unsigned long long>(c));
    //     for (size_t i = 0; i < 8; ++i)
    //     {
    //         witness_t<ComposerContext> value(context, char_bits[i]);
    //         values[length - 1 - count - 8 + i] = (value);
    //     }
    //     count += 8;
    // }
}

template <typename ComposerContext>
bitarray<ComposerContext>::bitarray(const std::vector<uint32<ComposerContext> > &input)
{
    auto it = std::find_if(input.begin(), input.end(), [](const auto x) { return x.get_context() != nullptr; });
    if (it != std::end(input))
    {
        context = it->get_context();
    }
    else
    {
        context = nullptr; // hmm
    }

    size_t num_words = input.size();
    size_t num_bits = num_words * 32;

    values.resize(num_bits);
    for (size_t i = 0; i < num_words; ++i)
    {
        size_t input_index = num_words - 1 - i;
        for (size_t j = 0; j < 32; ++j)
        {
            values[i * 32 + j] = input[input_index].at(j);
        }
    }
    length = num_bits;
}

template <typename ComposerContext>
bitarray<ComposerContext>::bitarray(const bitarray &other)
{
    context = other.context;
    std::copy(other.values.begin(), other.values.end(), std::back_inserter(values));
    length = values.size();
}

template <typename ComposerContext>
bitarray<ComposerContext>::bitarray(bitarray &&other)
{
    context = other.context;
    length = other.length;
    values = std::move(other.values); // yoink
}

template <typename ComposerContext>
bitarray<ComposerContext> &bitarray<ComposerContext>::operator=(const bitarray &other)
{
    length = other.length;
    context = other.context;
    values = std::vector<bool_t<ComposerContext> >();
    std::copy(other.values.begin(), other.values.end(), std::back_inserter(values));
    return *this;
}

template <typename ComposerContext>
bitarray<ComposerContext> &bitarray<ComposerContext>::operator=(bitarray &&other)
{
    length = other.length;
    context = other.context;
    values = std::move(other.values);
    return *this;
}

template <typename ComposerContext>
bool_t<ComposerContext> &bitarray<ComposerContext>::operator[](const size_t idx)
{
    return values[idx];
}

template <typename ComposerContext>
bool_t<ComposerContext> bitarray<ComposerContext>::operator[](const size_t idx) const
{
    return values[idx];
}

template <typename ComposerContext>
std::vector<uint32<ComposerContext> > bitarray<ComposerContext>::to_uint32_vector()
{
    size_t num_uint32s = (length / 32) + (length % 32 != 0);
    std::vector<uint32<ComposerContext> > output;
    // output.resize(num_uint32s);

    // printf("num_uint32 = %lu\n", num_uint32s);
    for (size_t i = 0; i < num_uint32s; ++i)
    {
        std::array<bool_t<ComposerContext>, 32 > bools;
        size_t end;
        size_t start;
        start = ((num_uint32s - i) * 32) - 32;
        end = start + 32 > length ? length : start + 32;
        for (size_t j = start; j < end; ++j)
        {
            // printf("j = %lu\n", j);
            // printf(" value = %u \n", values[j].get_witness_value() == true ? 1 : 0);
            bools[j - start] = values[j];
        }
        if (start + 32 > length)
        {
            for (size_t j = end; j < start + 32; ++j)
            {
                bools[j - start] = bool_t<ComposerContext>(context, false);
            }
        }
        output.push_back(uint32<ComposerContext>(context, bools));
        // printf(" uint32 value? = %x \n", output[output.size() - 1].get_witness_value());
    }
    // typename std::vector<bool_t<ComposerContext> >::const_iterator it = values.begin();
    // for (; std::distance(std::begin(values), it) < std::distance(std::begin(values), std::end(values)); it += 32)
    // {
    //     bool at_end = std::distance(std::begin(values), it + 32) > std::distance(std::begin(values), std::end(values));
    //     size_t index = num_uint32s - 1 - count;
    //     printf("index = %lu\n", index);
    //     if (at_end)
    //     {
    //         output[index] = (uint32(context, it, std::end(values)));
    //     }
    //     else
    //     {
    //         output[index] = (uint32(context, it, it + 32));
    //     }
    //     printf("value = %x \n", output[index].get_witness_value());
    //     ++count;
    // }
    return output;
}

template <typename ComposerContext>
std::string bitarray<ComposerContext>::get_witness_as_string() const
{
    size_t num_chars = length / 8;
    ASSERT(num_chars * 8 == length);

    std::string output;
    output.resize(num_chars);
    for (size_t i = 0; i < num_chars; ++i)
    {
        std::bitset<8> char_bits;
        size_t position = (length - 1 - ((i + 1) * 8));
        for (size_t j = 0; j < 8; ++j)
        {
            char_bits[j] = values[position + j].get_witness_value();
        }
        char foo = static_cast<char>(char_bits.to_ulong());
        output[i] = foo;
    }
    return output;
}
}
}