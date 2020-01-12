#pragma once

namespace plonk
{
namespace stdlib
{

template <typename Composer>
class group
{
public:
    group(ComposerContext* parent_context, const size_t generator_index);
    group(const group& other);

    group& operator=(const group& other);


    group operator+(const group& other);
    group operator-(const group& other);
    group operator*(const field_t& multiplier);
    field_t<ComposerContext> x;
    field_t<ComposerContext> y;
}
}
}

#include "group.tcc"