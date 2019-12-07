#pragma once
#include "../ast.hpp"
#include "lambda_visitor.hpp"
#include "types.hpp"

namespace noir {
namespace code_gen {

typedef boost::variant<bool_t, uint32, std::vector<bool_t>, std::vector<uint32>> var_t;

inline var_t var_t_factory(ast::variable_declaration const& x, Composer& composer)
{
    if (x.type.array_size.has_value()) {
        return x.type.type.apply_visitor(make_lambda_visitor<var_t>(
            [&](ast::bool_type const&) {
                auto y = bool_t(&composer);
                return std::vector<bool_t>(x.type.array_size.value(), bool_t(&composer));
            },
            [&](ast::int_type const&) { return std::vector<uint32>(x.type.array_size.value(), uint32(&composer)); }));
    } else {
        return x.type.type.apply_visitor(
            make_lambda_visitor<var_t>([&](ast::bool_type const&) { return bool_t(&composer); },
                                       [&](ast::int_type const&) { return uint32(&composer); }));
    }
}

namespace {
template <typename T> inline std::ostream& operator<<(std::ostream& os, std::vector<T> const& v)
{
    os << "[";
    for (auto it = v.begin(); it != v.end(); ++it) {
        os << *it;
        if (it != --v.end()) {
            os << ", ";
        }
    }
    return os << "]";
}

struct var_t_printer : boost::static_visitor<> {
    template <typename T> void operator()(T const& v, std::ostream& os) const { os << v; }
};
} // namespace

inline std::ostream& operator<<(std::ostream& os, var_t const& v)
{
    auto vos = boost::variant<std::ostream&>(os);
    boost::apply_visitor(var_t_printer(), v, vos);
    return os;
}

} // namespace code_gen
} // namespace noir