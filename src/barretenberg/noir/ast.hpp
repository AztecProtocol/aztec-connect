#pragma once
#include <boost/fusion/include/io.hpp>
#include <boost/spirit/home/x3/support/ast/position_tagged.hpp>
#include <boost/spirit/home/x3/support/ast/variant.hpp>
#include <list>

namespace noir {
namespace ast {
namespace x3 = boost::spirit::x3;

struct nil {};
struct operation;
struct unary;
struct function_call;
struct expression;

struct variable : x3::position_tagged {
    variable(std::string const& name = "")
        : name(name)
    {}
    std::string name;
};

struct constant : x3::variant<unsigned int, bool> {
    using base_type::base_type;
    using base_type::operator=;
};

struct array : x3::variant<std::vector<bool>, std::vector<unsigned int>> {
    using base_type::base_type;
    using base_type::operator=;
};

struct operand : x3::variant<nil,
                             constant,
                             array,
                             variable,
                             x3::forward_ast<unary>,
                             x3::forward_ast<function_call>,
                             x3::forward_ast<expression>> {
    using base_type::base_type;
    using base_type::operator=;
};

enum optoken {
    op_plus,
    op_minus,
    op_times,
    op_divide,
    op_positive,
    op_negative,
    op_not,
    op_equal,
    op_not_equal,
    op_less,
    op_less_equal,
    op_greater,
    op_greater_equal,
    op_and,
    op_or,
    op_bitwise_xor,
    op_bitwise_or,
    op_bitwise_and,
    op_bitwise_not,
    op_index,
};

struct operation : x3::position_tagged {
    optoken operator_;
    operand operand_;
};

struct expression : x3::position_tagged {
    operand first;
    std::list<operation> rest;
};

struct unary {
    optoken operator_;
    expression operand_;
};

struct assignment : x3::position_tagged {
    variable lhs;
    expression rhs;
};

struct function_call : x3::position_tagged {
    std::string name;
    std::list<expression> args;
};

struct type_id {
    std::string type;
    std::optional<unsigned int> array_size;
};

struct variable_declaration {
    type_id type;
    assignment assign;
};

struct statement_list;

struct function_argument {
    type_id type;
    std::string name;
};

struct function_declaration {
    type_id return_type;
    std::string name;
    std::list<function_argument> args;
    boost::recursive_wrapper<statement_list> statements;
};

// struct if_statement;
// struct while_statement;

struct statement : x3::variant<function_declaration,
                               variable_declaration,
                               assignment,
                               // boost::recursive_wrapper<if_statement>,
                               // boost::recursive_wrapper<while_statement>,
                               boost::recursive_wrapper<statement_list>> {
    using base_type::base_type;
    using base_type::operator=;
};

struct statement_list : std::vector<statement> {};

/*
struct if_statement {
    expression condition;
    statement then;
    boost::optional<statement> else_;
};

struct while_statement {
    expression condition;
    statement body;
};
*/

// print functions for debugging
inline std::ostream& operator<<(std::ostream& out, nil)
{
    out << "nil";
    return out;
}

inline std::ostream& operator<<(std::ostream& out, variable const& var)
{
    out << var.name;
    return out;
}
} // namespace ast
} // namespace noir
