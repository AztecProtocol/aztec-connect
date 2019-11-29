#include "compiler.hpp"
#include <boost/assert.hpp>
#include <boost/variant/apply_visitor.hpp>
#include <iostream>
#include <set>

namespace noir {
namespace code_gen {

// EXPRESSION VISITOR
ExpressionVisitor::ExpressionVisitor(waffle::StandardComposer& composer, SymbolTable& symbol_table)
    : composer_(composer)
    , symbol_table_(symbol_table)
{}

var_t ExpressionVisitor::operator()(unsigned int x)
{
    std::cout << "uint " << x << std::endl;
    return uint32(&composer_, x);
}

var_t ExpressionVisitor::operator()(bool x)
{
    std::cout << "bool " << x << std::endl;
    return bool_t(&composer_, x);
}

var_t ExpressionVisitor::operator()(ast::variable const& x)
{
    std::cout << "id " << x.name << std::endl;
    return symbol_table_[x.name];
}

namespace {
struct EqualityVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs == rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot compare differing types.");
    }
};

struct BitwiseOrVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs | rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot OR differing types.");
    }
};

struct BitwiseAndVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs & rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot AND differing types.");
    }
};

struct BitwiseXorVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs ^ rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot XOR differing types.");
    }
};

struct NegVis : boost::static_visitor<var_t> {
    var_t operator()(bool_t const&) const { throw std::runtime_error("Cannot neg bool."); }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot neg uint32."); }
};

struct NotVis : boost::static_visitor<var_t> {
    var_t operator()(bool_t const& var) const { return !var; }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot NOT a uint."); }
};

struct BitwiseNotVisitor : boost::static_visitor<var_t> {
    var_t operator()(bool_t const& var) const { return bool_t(stdlib::witness_t(var.context, var.value())); }
    var_t operator()(uint32 const&) const { throw std::runtime_error("No."); }
};
} // namespace

var_t ExpressionVisitor::operator()(var_t lhs, ast::operation const& x)
{
    var_t rhs = boost::apply_visitor(*this, x.operand_);

    switch (x.operator_) {
    case ast::op_plus:
        std::cout << "op_add" << std::endl;
        break;
    case ast::op_minus:
        std::cout << "op_sub" << std::endl;
        break;
    case ast::op_times:
        std::cout << "op_times" << std::endl;
        break;
    case ast::op_divide:
        std::cout << "op_divide" << std::endl;
        break;

    case ast::op_equal:
        std::cout << "op_equal" << std::endl;
        return boost::apply_visitor(EqualityVisitor(), lhs, rhs);
    case ast::op_not_equal:
        std::cout << "op_ne" << std::endl;
        break;
    case ast::op_less:
        std::cout << "op_lt" << std::endl;
        break;
    case ast::op_less_equal:
        std::cout << "op_lte" << std::endl;
        break;
    case ast::op_greater:
        std::cout << "op_gt" << std::endl;
        break;
    case ast::op_greater_equal:
        std::cout << "op_gte" << std::endl;
        break;

    case ast::op_and:
        std::cout << "op_and" << std::endl;
        break;
    case ast::op_or:
        std::cout << "op_or" << std::endl;
        break;

    case ast::op_bitwise_and:
        std::cout << "op_bitwise_and" << std::endl;
        return boost::apply_visitor(BitwiseAndVisitor(), lhs, rhs);
    case ast::op_bitwise_or:
        std::cout << "op_bitwise_or" << std::endl;
        return boost::apply_visitor(BitwiseOrVisitor(), lhs, rhs);
    case ast::op_bitwise_xor:
        std::cout << "op_bitwise_xor" << std::endl;
        return boost::apply_visitor(BitwiseXorVisitor(), lhs, rhs);
    default:
        BOOST_ASSERT(0);
    }

    return lhs;
}

var_t ExpressionVisitor::operator()(ast::unary const& x)
{
    var_t var = boost::apply_visitor(*this, x.operand_);

    switch (x.operator_) {
    case ast::op_negative:
        std::cout << "op_neg" << std::endl;
        return boost::apply_visitor(NegVis(), var);
    case ast::op_not: {
        auto v = boost::apply_visitor(NotVis(), var);
        std::cout << "op_not " << var << "->" << v << std::endl;
        return v;
    }
    case ast::op_bitwise_not: {
        auto v = boost::apply_visitor(BitwiseNotVisitor(), var);
        std::cout << "op_make_witness " << std::endl;
        return v;
    }
    case ast::op_positive:
        return var;
    default:
        throw std::runtime_error("Unknown operator.");
    }
}

var_t ExpressionVisitor::operator()(ast::expression const& x)
{
    var_t var = boost::apply_visitor(*this, x.first);
    for (ast::operation const& oper : x.rest) {
        var = (*this)(var, oper);
    }
    return var;
}

var_t ExpressionVisitor::operator()(ast::assignment const& x)
{
    var_t var = (*this)(x.rhs);
    std::cout << "op_store " << x.lhs.name << " " << var << std::endl;
    symbol_table_.set(var, x.lhs.name);
    return var;
}

// COMPILER
compiler::compiler(waffle::StandardComposer& composer)
    : composer_(composer)
{}

void compiler::operator()(ast::variable_declaration const& x)
{
    std::cout << "variable declaration: " << x.type << " " << x.assign.lhs.name << std::endl;
    if (x.type == "bool") {
        symbol_table_.set(bool_t(&composer_), x.assign.lhs.name);
    } else {
        throw std::runtime_error("Type not implemented: " + x.type);
    }
    ExpressionVisitor ev(composer_, symbol_table_);
    ev(x.assign);
}

void compiler::operator()(ast::assignment const& x)
{
    ExpressionVisitor ev(composer_, symbol_table_);
    ev(x);
}

void compiler::operator()(ast::statement const& x)
{
    std::cout << "statement" << std::endl;
    boost::apply_visitor(*this, x);
}

void compiler::operator()(ast::statement_list const& x)
{
    for (auto const& s : x) {
        (*this)(s);
    }
}

waffle::Prover compiler::start(ast::statement_list const& x)
{
    (*this)(x);
    auto prover = composer_.preprocess();
    printf("prover gates = %lu\n", prover.n);
    printf("composer gates = %lu\n", composer_.n);
    return prover;
}

} // namespace code_gen
} // namespace noir