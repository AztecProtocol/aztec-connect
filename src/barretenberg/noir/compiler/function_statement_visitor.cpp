#include "function_statement_visitor.hpp"
#include "expression_visitor.hpp"
#include <iostream>

namespace noir {
namespace code_gen {

FunctionStatementVisitor::FunctionStatementVisitor(CompilerContext& ctx, type_info const& target_type)
    : ctx_(ctx)
    , target_type_(target_type)
{}

var_t FunctionStatementVisitor::operator()(ast::variable_declaration const& x)
{
    std::cout << "function variable declaration " << x.variable << std::endl;

    var_t v = var_t_factory(x.type, ctx_.composer);
    ctx_.symbol_table.declare(v, x.variable);

    if (x.assignment.has_value()) {
        ast::assignment assign = { .lhs = x.variable, .rhs = x.assignment.value() };
        (*this)(assign);
    }

    return v;
}

var_t FunctionStatementVisitor::operator()(ast::assignment const& x)
{
    std::cout << "function variable assignment" << std::endl;
    var_t const& lhs = ctx_.symbol_table[x.lhs.name];
    return ExpressionVisitor(ctx_, lhs.type)(x);
}

var_t FunctionStatementVisitor::operator()(ast::function_statement const& x)
{
    std::cout << "function statement" << std::endl;
    return boost::apply_visitor(*this, x);
}

var_t FunctionStatementVisitor::operator()(ast::function_statement_list const& x)
{
    var_t result = bool_t(&ctx_.composer, false);
    for (auto const& s : x) {
        (*this)(s);
    }
    return uint32();
}

var_t FunctionStatementVisitor::operator()(boost::recursive_wrapper<ast::for_statement> const& x_)
{
    auto x = x_.get();
    ctx_.symbol_table.push();
    ctx_.symbol_table.declare(uint32(), x.counter);
    for (unsigned int i = x.from; i < x.to; ++i) {
        ctx_.symbol_table.set(uint32(&ctx_.composer, i), x.counter);
        ctx_.symbol_table.push();
        (*this)(x.body);
        ctx_.symbol_table.pop();
    }
    ctx_.symbol_table.pop();
    return uint32();
}

var_t FunctionStatementVisitor::operator()(ast::return_expr const& x)
{
    return ExpressionVisitor(ctx_, target_type_)(x.expr);
}

} // namespace code_gen
} // namespace noir