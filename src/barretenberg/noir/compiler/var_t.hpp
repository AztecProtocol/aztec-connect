#pragma once
#include "../ast.hpp"
#include "format.hpp"
#include "lambda_visitor.hpp"
#include "type_info.hpp"
#include "types.hpp"
#include <boost/format.hpp>

namespace noir {
namespace code_gen {

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

struct var_t_printer : boost::static_visitor<std::ostream&> {
    var_t_printer(std::ostream& os)
        : os(os)
    {}
    template <typename T> result_type operator()(T const& v) const { return os << v; }
    std::ostream& os;
};
} // namespace

struct var_t {
    // typedef boost::make_recursive_variant<bool_t, uint32, std::vector<boost::recursive_variant_>>::type value_t;
    typedef boost::variant<bool_t, uint32, boost::recursive_wrapper<std::vector<var_t>>> value_t;

    var_t(value_t const& value, type_info const& type)
        : value(value)
        , type(type){};

    var_t(uint32 value)
        : value(value)
        , type(type_uint32)
    {}

    var_t(bool_t value)
        : value(value)
        , type(type_bool)
    {}

    template <typename T>
    var_t(std::vector<T> value)
        : value(value)
        , type(array_type{ .size = value.size(), .element_type = value[0].type.type })
    {}

    var_t(var_t const& rhs)
        : value(rhs.value)
        , type(rhs.type)
    {}

    var_t(var_t&& rhs)
        : value(std::move(rhs.value))
        , type(std::move(rhs.type))
    {}

    var_t& operator=(var_t const& rhs)
    {
        value = rhs.value;
        type = rhs.type;
        return *this;
    }

    std::string const to_string() const
    {
        std::ostringstream os;
        boost::apply_visitor(var_t_printer(os), value);
        return os.str();
    }

    value_t value;
    type_info type;
};

/*
inline var_t var_t_factory(ast::type_id const& type, Composer& composer)
{
    if (type.array_size.has_value()) {
        return type.type.apply_visitor(make_lambda_visitor<var_t>(
            [&](ast::bool_type const&) { return std::vector<bool_t>(type.array_size.value(), bool_t(&composer)); },
            [&](ast::int_type const&) { return std::vector<uint32>(type.array_size.value(), uint32(&composer)); }));
    } else {
        return type.type.apply_visitor(
            make_lambda_visitor<var_t>([&](ast::bool_type const&) { return bool_t(&composer); },
                                       [&](ast::int_type const&) { return uint32(&composer); }));
    }
}
*/

struct VarTFactoryVisitor : boost::static_visitor<var_t> {
    VarTFactoryVisitor(type_info const& type, Composer& composer)
        : composer(composer)
        , type(type){};
    result_type operator()(bool_type const&) const { return var_t(bool_t(&composer), type); }
    result_type operator()(int_type const&) const { return var_t(uint32(&composer), type); }
    //result_type operator()(int_type const& t) const { return var_t(uint(t.width, &composer), type); }
    result_type operator()(array_type const& arr) const
    {
        var_t defaultElement = boost::apply_visitor(VarTFactoryVisitor(arr.element_type, composer), arr.element_type);
        return var_t(std::vector<var_t>(arr.size, defaultElement), type);
    }
    Composer& composer;
    type_info const& type;
};

inline var_t var_t_factory(type_info const& type, Composer& composer)
{
    return boost::apply_visitor(VarTFactoryVisitor(type, composer), type.type);
}

inline std::ostream& operator<<(std::ostream& os, var_t const& v)
{
    return boost::apply_visitor(var_t_printer(os), v.value);
}

} // namespace code_gen
} // namespace noir