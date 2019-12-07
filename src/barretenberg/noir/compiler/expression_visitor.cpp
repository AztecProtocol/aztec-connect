#include "expression_visitor.hpp"
#include "function_statement_visitor.hpp"
#include "operators.hpp"
#include <boost/format.hpp>
#include <iostream>

namespace noir {
namespace code_gen {

ExpressionVisitor::ExpressionVisitor(CompilerContext& ctx)
    : ctx_(ctx)
{}

var_t ExpressionVisitor::operator()(unsigned int x)
{
    std::cout << "uint " << x << std::endl;
    return uint32(&ctx_.composer, x);
}

var_t ExpressionVisitor::operator()(bool x)
{
    std::cout << "bool " << x << std::endl;
    return bool_t(&ctx_.composer, x);
}

var_t ExpressionVisitor::operator()(std::vector<unsigned int> const& x)
{
    std::cout << "uint32[] " << x.size() << std::endl;
    std::vector<uint32> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](unsigned int v) { return uint32(&ctx_.composer, v); });
    return result;
}

var_t ExpressionVisitor::operator()(std::vector<bool> const& x)
{
    std::cout << "bool[] " << x.size() << std::endl;
    std::vector<bool_t> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](bool v) { return bool_t(&ctx_.composer, v); });
    return result;
}

var_t ExpressionVisitor::operator()(std::vector<std::string> const& x)
{
    std::cout << "identifier[] " << x.size() << std::endl;
    // TODO: uhhh, what's our type? :(
    std::vector<var_t> result(x.size());
    std::transform(x.begin(), x.end(), result.begin(), [this](std::string const& v) { return ctx_.symbol_table[v]; });
    return bool_t();
}

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
    case ast::op_bitwise_ror:
        std::cout << "op_bitwise_ror" << std::endl;
        break;
    case ast::op_bitwise_rol:
        std::cout << "op_bitwise_rol" << std::endl;
        break;

    case ast::op_index: {
        std::cout << "op_index" << std::endl;

        // Evaluate index.
        uint32* iptr = boost::get<uint32>(&rhs);
        if (!iptr) {
            throw std::runtime_error("Index must be an integer.");
        }
        uint32_t i = (*iptr).get_value();

        return boost::apply_visitor(IndexVisitor(), lhs, boost::variant<unsigned int>(i));
    }
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

var_t ExpressionVisitor::operator()(ast::variable const& x)
{
    std::cout << "variable " << x.name << std::endl;
    return ctx_.symbol_table[x.name];
}

var_t ExpressionVisitor::operator()(ast::assignment const& x)
{
    std::cout << "get symbol ref for assign " << x.lhs.name << std::endl;
    var_t rhs = (*this)(x.rhs);

    var_t& lhs = ctx_.symbol_table[x.lhs.name];

    // If our lhs has indexes, we need to get the ref to indexed element.
    if (x.lhs.indexes.size()) {
        if (x.lhs.indexes.size() > 1) {
            throw std::runtime_error("Multidimensional arrays not yet supported.");
        }

        // Evaluate index.
        auto ivar = (*this)(x.lhs.indexes[0]);
        uint32* iptr = boost::get<uint32>(&ivar);
        if (!iptr) {
            throw std::runtime_error("Index must be an integer.");
        }
        uint32_t i = (*iptr).get_value();
        std::cout << "op_store " << x.lhs.name << "[" << i << "] " << rhs << std::endl;

        boost::apply_visitor(IndexedAssignVisitor(i), lhs, rhs);
    } else {
        std::cout << "op_store " << x.lhs.name << " " << rhs << std::endl;
        lhs = rhs;
    }
    return lhs;
}

var_t ExpressionVisitor::operator()(ast::function_call const& x)
{
    std::cout << "function call " << x.name << std::endl;
    auto func = ctx_.functions[x.name];
    if (x.args.size() != func.args.size()) {
        throw std::runtime_error(
            (boost::format("Function call to %s has incorrect number of arguments. Expected %d, received %d.") %
             x.name % func.args.size() % x.args.size())
                .str());
    }
    ctx_.symbol_table.push();
    for (size_t i = 0; i < func.args.size(); ++i) {
        ctx_.symbol_table.declare((*this)(x.args[i]), func.args[i].name);
    }
    var_t result = FunctionStatementVisitor(ctx_)(func.statements.get());
    ctx_.symbol_table.pop();
    return result;
}

var_t ExpressionVisitor::operator()(ast::constant const& x)
{
    return boost::apply_visitor(*this, x);
}

var_t ExpressionVisitor::operator()(ast::array const& x)
{
    return boost::apply_visitor(*this, x);
}

} // namespace code_gen
} // namespace noir