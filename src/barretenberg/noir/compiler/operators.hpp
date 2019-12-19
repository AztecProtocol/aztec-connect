#pragma once

namespace noir {
namespace code_gen {

struct AdditionVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const { return lhs + rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot perform add.");
    }
};

struct SubtractionVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const { return lhs - rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot perform subtraction.");
    }
};

struct MultiplyVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const { return lhs * rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot perform multiplication.");
    }
};

struct DivideVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const { return lhs / rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot perform division.");
    }
};

struct ModVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const
    {
        if (!lhs.is_constant() || !rhs.is_constant()) {
            throw std::runtime_error("Can only modulo constants.");
        }
        return uint(lhs.width(), lhs.get_value() % rhs.get_value());
    }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot perform modulo.");
    }
};

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
    template <typename T> var_t operator()(std::vector<T>&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T& lhs, T const& rhs) const { return lhs | rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot OR differing types.");
    }
};

struct BitwiseAndVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T>&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T& lhs, T const& rhs) const { return lhs & rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot AND differing types.");
    }
};

struct BitwiseXorVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T>&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T& lhs, T const& rhs) const { return lhs ^ rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot XOR differing types.");
    }
};

struct BitwiseRorVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const
    {
        if (!rhs.is_constant()) {
            throw std::runtime_error("Can only perform bitwise rotation by constants.");
        }
        return lhs.ror(rhs.get_value());
    }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot rotate right.");
    }
};

struct BitwiseRolVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const
    {
        if (!rhs.is_constant()) {
            throw std::runtime_error("Can only perform bitwise rotation by constants.");
        }
        return lhs.rol(rhs.get_value());
    }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot rotate left.");
    }
};

struct BitwiseShlVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const
    {
        if (!rhs.is_constant()) {
            throw std::runtime_error("Can only perform bitwise shift by constants.");
        }
        return lhs << rhs.get_value();
    }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot shift left.");
    }
};

struct BitwiseShrVisitor : boost::static_visitor<var_t> {
    var_t operator()(uint& lhs, uint const& rhs) const
    {
        if (!rhs.is_constant()) {
            throw std::runtime_error("Can only perform bitwise shift by constants.");
        }
        return lhs >> rhs.get_value();
    }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot shift right.");
    }
};

struct NegVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const&) const { throw std::runtime_error("Cannot neg bool."); }
    var_t operator()(uint const&) const { throw std::runtime_error("Cannot neg uint."); }
};

struct NotVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const& var) const { return !var; }
    var_t operator()(uint const&) const { throw std::runtime_error("Cannot NOT a uint."); }
};

struct BitwiseNotVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t& var) const { return ~var; }
    var_t operator()(uint& var) const { return ~var; }
};

struct IndexVisitor : boost::static_visitor<var_t> {
    IndexVisitor(size_t i)
        : i(i)
    {}

    template <typename T> var_t operator()(std::vector<T>& lhs) const
    {
        std::cout << "indexing " << i << ": " << lhs[i] << std::endl;
        return lhs[i];
    }
    var_t operator()(noir::code_gen::uint& lhs) const
    {
        bool_t bit = lhs.at(lhs.width() - i - 1);
        std::cout << "indexing uint for bit " << i << ": " << bit << " witness: " << bit.witness_index << std::endl;
        return bit;
    }
    template <typename T> var_t operator()(T& t) const
    {
        throw std::runtime_error(format("Cannot index given type: %s", typeid(t).name()));
    }

    size_t i;
};

} // namespace code_gen
} // namespace noir