#pragma once
#include "expression_visitor.hpp"
#include "type_info.hpp"

namespace noir {
namespace code_gen {

inline type_info type_info_from_type_id(CompilerContext ctx, ast::type_id const& t)
{
    noir_type nt = t.type.apply_visitor(IntrinsicTypeInfoVisitor());
    bool mutable_ = t.qualifier.has_value() && t.qualifier.value() == ast::q_mutable;
    if (t.array_size.has_value()) {
        auto size_var = ExpressionVisitor(ctx, type_uint32)(t.array_size.value());
        uint32_t size = boost::get<uint32>(size_var.value).get_value();
        return type_info(nt, size, mutable_);
    }
    return type_info(nt);
}

inline type_info type_info_from_type_id(ast::function_type_id const& t)
{
    noir_type nt = t.type.apply_visitor(IntrinsicTypeInfoVisitor());
    if (t.array_size.has_value()) {
        auto size = t.array_size.value().value_or(0);
        return type_info(nt, size, false);
    }
    return type_info(nt);
}

} // namespace code_gen
} // namespace noir