#pragma once
#include "error_handler.hpp"
#include <boost/spirit/home/x3.hpp>

namespace noir {
namespace parser {

typedef boost::spirit::x3::alternative<
    boost::spirit::x3::char_class<boost::spirit::char_encoding::ascii, boost::spirit::x3::space_tag>,
    boost::spirit::x3::lexeme_directive<boost::spirit::x3::sequence<
        boost::spirit::x3::sequence<
            boost::spirit::x3::
                literal_string<char const*, boost::spirit::char_encoding::standard, boost::spirit::x3::unused_type>,
            boost::spirit::x3::kleene<
                boost::spirit::x3::difference<boost::spirit::x3::any_char<boost::spirit::char_encoding::standard>,
                                              boost::spirit::x3::eol_parser>>>,
        boost::spirit::x3::eol_parser>>>
    skipper;

typedef std::string::const_iterator iterator_type;
typedef x3::phrase_parse_context<skipper>::type phrase_context_type;
typedef error_handler<iterator_type> error_handler_type;
typedef x3::context<error_handler_tag, std::reference_wrapper<error_handler_type>, phrase_context_type> context_type;

} // namespace parser
} // namespace noir
