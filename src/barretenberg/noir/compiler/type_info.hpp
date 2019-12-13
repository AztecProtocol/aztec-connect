#include "../ast.hpp"
#include <boost/algorithm/string/join.hpp>
#include <unordered_map>

namespace noir {
namespace code_gen {

struct int_type {
    size_t width;
    bool signed_;
};

struct bool_type {};
struct array_type;
struct tuple_type;
struct struct_type;

typedef boost::variant<bool_type, int_type> intrinsic_type;

typedef boost::variant<bool_type,
                       int_type,
                       boost::recursive_wrapper<array_type>/*,
                       boost::recursive_wrapper<tuple_type>,
                       boost::recursive_wrapper<struct_type>*/>
    noir_type;

struct array_type {
    noir_type element_type;
    size_t size;
};

struct tuple_type {
    std::vector<noir_type> types;
};

struct struct_type {
    std::unordered_map<std::string, noir_type> fields;
};

struct IntrinsicTypeInfoVisitor : boost::static_visitor<intrinsic_type> {
    result_type operator()(ast::bool_type const&) const { return bool_type{}; }
    result_type operator()(ast::int_type const& v) const
    {
        return int_type{ .signed_ = v.type == "int", .width = v.size };
    }
};

struct TypeIdNameVisitor : boost::static_visitor<std::string const> {
    result_type operator()(bool_type const&) const { return "bool"; }
    result_type operator()(int_type const& v) const { return format("uint%d", v.width); }
    result_type operator()(array_type const& v) const { return format("%s[%d]", (*this)(v.element_type), v.size); }
    result_type operator()(tuple_type const& v) const
    {
        std::vector<std::string> result;
        std::transform(
            v.types.begin(), v.types.end(), result.begin(), [this](noir_type const& t) { return (*this)(t); });
        return format("(%s)", boost::algorithm::join(result, ","));
    }
    result_type operator()(noir_type const& v) const { return v.apply_visitor(*this); }
};

struct type_info {
    type_info(noir_type const& t)
        : type(t)
        , mutable_(false)
    {}

    type_info(type_info const& other)
        : type(other.type)
        , mutable_(other.mutable_)
    {}

    type_info(ast::type_id const& t)
    {
        type = t.type.apply_visitor(IntrinsicTypeInfoVisitor());
        if (t.array_size.has_value()) {
            type = array_type{ .element_type = type, .size = t.array_size.value() };
        }
        mutable_ = t.qualifier.has_value() && t.qualifier.value() == ast::q_mutable;
    }

    std::string const type_name() const { return boost::apply_visitor(TypeIdNameVisitor(), type); }

    noir_type type;
    bool mutable_;
};

inline std::ostream& operator<<(std::ostream& os, type_info const& t)
{
    return os << t.type_name();
}

const auto type_uint32 = type_info(int_type{ .signed_ = false, .width = 32 });
const auto type_bool = type_info(bool_type{});

} // namespace code_gen
} // namespace noir