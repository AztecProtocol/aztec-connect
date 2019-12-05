#include "compiler.hpp"
#include "lambda_visitor.hpp"
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

var_t ExpressionVisitor::operator()(std::vector<unsigned int> const& x)
{
    std::cout << "uint32[] " << x.size() << std::endl;
    std::vector<uint32> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](unsigned int v) { return uint32(&composer_, v); });
    return result;
}

var_t ExpressionVisitor::operator()(std::vector<bool> const& x)
{
    std::cout << "bool[] " << x.size() << std::endl;
    std::vector<bool_t> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](bool v) { return bool_t(&composer_, v); });
    return result;
}

var_t ExpressionVisitor::operator()(std::vector<std::string> const& x)
{
    std::cout << "identifier[] " << x.size() << std::endl;
    // TODO: uhhh, what's our type? :(
    std::vector<var_t> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](std::string const& v) { return symbol_table_[v]; });
    return bool_t();
}

var_t ExpressionVisitor::operator()(ast::variable const& x)
{
    std::cout << "id " << x.name << std::endl;
    return symbol_table_[x.name];
}

namespace {
struct EqualityVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array equality.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs == rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot compare differing types.");
    }
};

struct BitwiseOrVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs | rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot OR differing types.");
    }
};

struct BitwiseAndVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs & rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot AND differing types.");
    }
};

struct BitwiseXorVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs ^ rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot XOR differing types.");
    }
};

struct NegVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const&) const { throw std::runtime_error("Cannot neg bool."); }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot neg uint32."); }
};

struct NotVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const& var) const { return !var; }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot NOT a uint."); }
};

struct BitwiseNotVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
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

    case ast::op_index:
        std::cout << "op_index" << std::endl;
        break;
    default:
        BOOST_ASSERT(0);
    }

    return lhs;
}

var_t ExpressionVisitor::operator()(ast::unary const& x)
{
    var_t var = (*this)(x.operand_);

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

var_t ExpressionVisitor::operator()(ast::function_call const& x)
{
    std::cout << "function call " << x.name << std::endl;
    return bool_t(&composer_, false);
}

var_t ExpressionVisitor::operator()(ast::constant const& x)
{
    return boost::apply_visitor(*this, x);
}

var_t ExpressionVisitor::operator()(ast::array const& x)
{
    return boost::apply_visitor(*this, x);
}

// COMPILER
compiler::compiler(waffle::StandardComposer& composer)
    : composer_(composer)
{}

void compiler::operator()(ast::variable_declaration const& x)
{
    std::cout << "variable declaration " << x.variable << std::endl;

    if (x.type.array_size.has_value()) {
        x.type.type.apply_visitor(make_lambda_visitor<void>(
            [this, x](ast::bool_type const&) {
                symbol_table_.set(std::vector<bool_t>(x.type.array_size.value(), bool_t(&composer_)), x.variable);
            },
            [this, x](ast::int_type const&) {
                symbol_table_.set(std::vector<uint32>(x.type.array_size.value(), uint32(&composer_)), x.variable);
            }));
    } else {
        x.type.type.apply_visitor(make_lambda_visitor<void>(
            [this, x](ast::bool_type const&) { symbol_table_.set(bool_t(&composer_), x.variable); },
            [this, x](ast::int_type const&) { symbol_table_.set(uint32(&composer_), x.variable); }));
    }

    if (x.assignment.has_value()) {
        ast::assignment assign = { .lhs = x.variable, .rhs = x.assignment.value() };
        (*this)(assign);
    }
}

void compiler::operator()(ast::function_declaration const& x)
{
    std::cout << "function declaration: " << x.return_type.type << " " << x.name << std::endl;
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

void compiler::operator()(ast::for_statement const& x)
{
    for (unsigned int i = x.from; i < x.to; ++i) {
        symbol_table_.set(uint32(&composer_, i), x.counter.name);
        (*this)(x.body);
    }
}

void compiler::operator()(ast::return_expr const& x)
{
    ExpressionVisitor ev(composer_, symbol_table_);
    var_t result = ev(x.expr);
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