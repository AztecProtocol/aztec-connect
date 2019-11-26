#include "ast.hpp"
#include "config.hpp"
#include "error_handler.hpp"
#include "statement.hpp"
#include <iostream>

namespace noir {

ast::statement_list parse(std::string const& source) {
    parser::iterator_type iter(source.begin());
    parser::iterator_type end(source.end());

    ast::statement_list ast;

    using boost::spirit::x3::with;
    using parser::error_handler_type;
    error_handler_type error_handler(iter, end, std::cerr);

    // we pass our error handler to the parser so we can access it later on in our on_error and on_sucess handlers.
    auto const parser = with<parser::error_handler_tag>(std::ref(error_handler))[statement()];

    using boost::spirit::x3::ascii::space;
    bool success = phrase_parse(iter, end, parser, space, ast);

    if (!success) {
        throw std::runtime_error("Parser failed.");
    }

    return ast;
}

} // namespace noir