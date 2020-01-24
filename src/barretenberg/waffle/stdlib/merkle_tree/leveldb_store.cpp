#include "leveldb_store.hpp"
#include "hash.hpp"
#include <iostream>
#include <sstream>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

namespace {
barretenberg::fr::field_t from_string(std::string const& data, size_t offset = 0)
{
    barretenberg::fr::field_t result;
    std::copy(data.data() + offset, data.data() + offset + sizeof(barretenberg::fr::field_t), (char*)result.data);
    return result;
}
template <typename T> T from_slice(leveldb::Slice& slice)
{
    T result;
    std::copy(slice.data(), slice.data() + sizeof(T), (char*)&result);
    slice = leveldb::Slice(slice.data() + sizeof(T), slice.size() - sizeof(T));
    return result;
}

/*
inline std::string hash(std::vector<std::string> const& input)
{
    std::vector<barretenberg::fr::field_t> inputs;
    std::transform(
        input.begin(), input.end(), std::back_inserter(inputs), [](std::string const& s) { return from_string(s, 0); });
    auto result = hash(inputs);
    return std::string((char*)&result, (char*)&result + sizeof(result));
}
*/

} // namespace

LevelDbStore::LevelDbStore(std::string const& db_path, size_t depth)
    : depth_(depth)
{
    ASSERT(depth_ >= 1 && depth <= 256);
    total_size_ = 1ULL << depth_;
    zero_hashes_.resize(depth);

    leveldb::DB* db;
    leveldb::Options options;
    options.create_if_missing = true;
    options.compression = leveldb::kNoCompression;
    leveldb::Status status = leveldb::DB::Open(options, db_path, &db);
    assert(status.ok());
    db_.reset(db);

    // Compute the zero values at each layer.
    auto current = barretenberg::fr::zero;
    for (size_t i = 0; i < depth; ++i) {
        zero_hashes_[i] = current;
        // std::cout << "zero hash level " << i << ": " << current << std::endl;
        current = hash({ current, current });
    }

    std::string root;
    status = db->Get(leveldb::ReadOptions(), "root", &root);
    if (!status.ok()) {
        root_ = current;
    } else {
        root_ = from_string(root);
    };
}

barretenberg::fr::field_t LevelDbStore::root() const
{
    return root_;
}

fr_hash_path LevelDbStore::get_hash_path(size_t index)
{
    fr_hash_path path(depth_);

    std::string current;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root_, 32), &current);

    for (size_t i = depth_ - 1; i < depth_; --i) {
        if (!status.ok()) {
            // This is an empty subtree. Fill in zero value.
            path[i] = std::make_pair(zero_hashes_[i], zero_hashes_[i]);
            continue;
        }

        leveldb::Slice slice(current);
        auto left = from_slice<fr::field_t>(slice);
        auto right = from_slice<fr::field_t>(slice);
        path[i] = std::make_pair(left, right);
        bool is_right = (index >> i) & 0x1;
        status = db_->Get(leveldb::ReadOptions(), current.substr(is_right * 32, 32), &current);

        /*
        leveldb::Slice slice(current);
        uint8_t type = from_slice<uint8_t>(slice);

        if (type == 0) {
            // This is a regular node with left and right trees. Descend according to index path.
            auto left = from_slice<fr::field_t>(slice);
            auto right = from_slice<fr::field_t>(slice);
            path[i] = std::make_pair(left, right);
            bool is_right = (index >> i) & 0x1;
            status = db_->Get(leveldb::ReadOptions(), current.substr(1 + is_right * 32, 32), &current);
        } else if (type == 1) {
            // This is a subtree with a single element. The hash path can be fully restored from this node.
            uint64_t element_index = from_slice<uint64_t>(slice);
            uint8_t tree_depth = from_slice<uint8_t>(slice);
            fr::field_t current = from_slice<fr::field_t>(slice);
            for (size_t j = 0; j < tree_depth; ++j) {
                bool is_right = (element_index >> j) & 0x1;
                if (is_right) {
                    path[j] = std::make_pair(zero_hashes_[j], current);
                } else {
                    path[j] = std::make_pair(current, zero_hashes_[j]);
                }
                current = hash({ path[j].first, path[j].second });
            }
            break;
        }
        */
    }

    return path;
}

fr::field_t LevelDbStore::get_element(size_t index)
{
    return get_element(root_, index, depth_);
}

fr::field_t LevelDbStore::get_element(fr::field_t const& root, size_t index, size_t height)
{
    if (height == 0) {
        return root;
    }

    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root, 32), &data);

    if (!status.ok()) {
        return zero_hashes_[0];
    }

    bool is_right = (index >> (height - 1)) & 0x1;
    fr::field_t subtree_root = from_string(data, is_right * 32);
    size_t subtree_index = index & ~(1ULL << height);
    return get_element(subtree_root, subtree_index, height - 1);
}

void LevelDbStore::update_element(size_t index, fr::field_t const& value)
{
    // std::cout << "PRE UPDATE ROOT: " << root_ << std::endl;
    leveldb::WriteBatch batch;
    root_ = update_element(root_, value, index, depth_, batch);
    db_->Write(leveldb::WriteOptions(), &batch);
    // std::cout << "POST UPDATE ROOT: " << root_ << std::endl;
}

fr::field_t LevelDbStore::update_element(
    fr::field_t const& root, fr::field_t const& value, size_t index, size_t height, leveldb::WriteBatch& batch)
{
    // std::cout << "update_element root:" << root << " value:" << value << " index:" << index << " height:" << height
    // << std::endl;
    if (height == 0) {
        return value;
    }

    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root, 32), &data);

    if (!status.ok()) {
        // Add the entire missing branch.
        // std::cout << "Add missing branch." << std::endl;
        fr::field_t current = value;
        for (size_t i = 0; i < height; ++i) {
            bool is_right = (index >> i) & 0x1;
            fr::field_t left, right;
            if (is_right) {
                left = zero_hashes_[i];
                right = current;
            } else {
                right = zero_hashes_[i];
                left = current;
            }
            std::ostringstream os;
            os.write((char*)left.data, 32);
            os.write((char*)right.data, 32);
            auto key = hash({ is_right ? zero_hashes_[i] : current, is_right ? current : zero_hashes_[i] });
            batch.Put(leveldb::Slice((char*)key.data, 32), os.str());
            // std::cout << "BRANCH PUT key:" << key << " left:" << left << " right:" << right << std::endl;
            current = key;
        }
        return current;
    }

    bool is_right = (index >> (height - 1)) & 0x1;
    // std::cout << "is_right:" << is_right << std::endl;
    fr::field_t subtree_root = from_string(data, is_right * 32);
    size_t subtree_index = index & ~(1ULL << height);
    auto current = update_element(subtree_root, value, subtree_index, height - 1, batch);
    data.replace(is_right * 32, 32, (char*)&current, 32);
    auto left = from_string(data, 0);
    auto right = from_string(data, 32);
    auto key = hash({ left, right });
    // TODO: Perhaps delete old node?
    batch.Put(leveldb::Slice((char*)key.data, 32), data);
    // std::cout << "UPDATE PUT key:" << key << " left:" << left << " right:" << right << std::endl;
    return key;
    /*
        if (!status.ok()) {
            std::ostringstream os;
            if (height) {
                // Insert a single node
                uint8_t type = 1;
                uint64_t element_index = index;
                uint8_t tree_depth = height;
                os.write((char*)&type, sizeof(type));
                os.write((char*)&element_index, sizeof(element_index));
                os.write((char*)&tree_depth, sizeof(tree_depth));
            } else {
                uint8_t type = 0;
                os.write((char*)&type, sizeof(type));
                if (index) {
                    os.write((char*)&zero_hashes_[height], 32);
                    os.write(value.data(), 32);
                } else {
                    os.write(value.data(), 32);
                    os.write((char*)&zero_hashes_[height], 32);
                }
            }
            db_->Put(leveldb::WriteOptions(), key, os.str());
            return;
        }

        // We have an existing node. Recurse downwards.
        auto left = data.substr()
        auto right = from_slice<fr::field_t>(slice);
        path[i] = std::make_pair(left, right);
        bool is_right = (index >> i) & 0x1;
        */
}

/*
void LevelDbStore::update_hash_path(size_t index, fr_hash_path path)
{
    std::string current;
    auto status = db_->Get(leveldb::ReadOptions(), root_, &current);
    leveldb::Slice slice(current);

    for (size_t i = depth_ - 1; i >= 0; --i) {
        if (!status.ok()) {
            // Insert a single node
            break;
        }

        leveldb::Slice slice(current);
        uint8_t type = from_slice<uint8_t>(slice);

        if (type == 0)
            uint8_t = std::ostringstream os;
        os.write()
    }
}
*/
} // namespace merkle_tree

} // namespace stdlib
} // namespace plonk