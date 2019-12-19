#pragma once
#include "../ast.hpp"
#include "format.hpp"
#include "lambda_visitor.hpp"
#include "type_info.hpp"
#include "types.hpp"
#include <boost/format.hpp>

namespace noir {
namespace code_gen {

struct var_t {
    typedef boost::variant<bool_t, uint, boost::recursive_wrapper<std::vector<var_t>>> value_t;

    var_t(value_t const& value, type_info const& type)
        : value(value)
        , type(type){};

    var_t(uint value)
        : value(value)
        , type(int_type{ .signed_ = false, .width = value.width() })
    {}

    var_t(char value)
        : value(uint(value))
        , type(type_uint8)
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

    std::string const to_string() const;

    value_t value;
    type_info type;
};

struct var_t_printer : boost::static_visitor<std::ostream&> {
    var_t_printer(std::ostream& os)
        : os(os)
    {}
    result_type operator()(uint const& v) const { return os << v; }
    result_type operator()(bool_t const& v) const { return os << v; }

    result_type operator()(std::vector<var_t> const& v) const
    {
        os << "[";
        for (auto it = v.begin(); it != v.end(); ++it) {
            it->value.apply_visitor(*this);
            if (it != --v.end()) {
                os << ", ";
            }
        }
        return os << "]";
    }

    std::ostream& os;
};

inline std::string const var_t::to_string() const
{
    std::ostringstream os;
    boost::apply_visitor(var_t_printer(os), value);
    return os.str();
}

struct VarTFactoryVisitor : boost::static_visitor<var_t> {
    VarTFactoryVisitor(type_info const& type, Composer& composer)
        : composer(composer)
        , type(type){};
    result_type operator()(bool_type const&) const { return var_t(bool_t(&composer), type); }
    result_type operator()(int_type const& t) const { return var_t(uint(t.width, &composer), type); }
    // result_type operator()(int_type const& t) const { return var_t(uint(t.width, &composer), type); }
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
    os << "(" << v.type << ")";
    return boost::apply_visitor(var_t_printer(os), v.value);
}

} // namespace code_gen
} // namespace noir