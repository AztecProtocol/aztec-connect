#pragma once
#include "ast.hpp"
#include <boost/fusion/include/adapt_struct.hpp>

BOOST_FUSION_ADAPT_STRUCT(noir::ast::unary, operator_, operand_)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::index, operator_, operand_)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::operation, operator_, operand_)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::expression, first, rest)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::type_id, type, array_size)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::variable_declaration, type, assign)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::function_argument, type, name)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::function_declaration, return_type, name, args, statements)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::function_call, name, args)

BOOST_FUSION_ADAPT_STRUCT(noir::ast::assignment, lhs, rhs)

// BOOST_FUSION_ADAPT_STRUCT(noir::ast::if_statement, condition, then, else_)

// BOOST_FUSION_ADAPT_STRUCT(noir::ast::while_statement, condition, body)
