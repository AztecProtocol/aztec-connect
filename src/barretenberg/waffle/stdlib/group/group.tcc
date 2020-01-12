#pragma once

#include "../../../curves/grumpkin/grumpkin.hpp"

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
group<ComposerContext>::group(ComposerContext* parent_context, const size_t generator_index) : context(parent_context)
{
    grumpkin::g1::affine_element point = grumpkin::get_generator(generator_index);
    x = witness_t(context, point.x);
    y = witness_t(context, point.y);
}

group<ComposerContext>::operator+(const group& other)
{
    // lambda = (y_2 - y_1) / (x_2 - x_1)
    // x_3 = lambda^2 - x_2 - x_1
    // y_3 = lambda * (x_1 - x_3) - y_1
    field_t y_diff = y - other.y;
    field_t x_diff = x - other.x;
    field_t lambda = y_diff / x_diff;

    group<ComposerContext> result(this);
    result.x = lambda * lambda - x - other.x;
    result.y = lambda * (other.x - result.x) - other.y;
    return result;
}

group<ComposerContext>::operator-(const group& other)
{
    field_t y_diff = y + other.y;
    field_t x_diff = x - other.x;
    field_t lambda = y_diff / x_diff;

    group<ComposerContext> result(this);
    result.x = lambda * lambda - x - other.x;
    result.y = lambda * (other.x - result.x) + other.y;
    return result;
}

group<ComposerContext>::operator*(const field_t& multiplier)
{
    
}
}
}