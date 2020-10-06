The rollup architecture has been designed to support custom circuits written in our DSL `Noir`. The rollup will be upgraded in Q1 2021 to enable this, with a developer preview of Noir being released in Q4 2020.

## Noir sha256 hash circuit

```rust

fn main(x : Witness, low : Witness, high: Witness) {

    let digest = std::hash::sha256(x as u8);

    constrain digest[0] == low;
    constrain digest[1] == high;
}

fn add(x : Witness, y : Witness) {
    x + y
}

```

Aztec is currently working with leading protocols to develop scalable and private versions of DeFi, if you would like to work with us, please reach out to joe@aztecprotocol.com.
