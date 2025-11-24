const { MerkleTree } = require('merkletreejs');
const { sha3_256 } = require('js-sha3');

const addresses = [
    "0000000000000000000000000000000000000000000000000000000000000001",
    "0000000000000000000000000000000000000000000000000000000000000002",
    "0000000000000000000000000000000000000000000000000000000000000003",
    "0000000000000000000000000000000000000000000000000000000000000004",
    "0000000000000000000000000000000000000000000000000000000000000005"
];

const leaves = addresses.map(addr => {
    const addrBytes = Buffer.from(addr, "hex");
    return Buffer.from(sha3_256(addrBytes), "hex");
});

const tree = new MerkleTree(leaves, (data) => Buffer.from(sha3_256(data), "hex"), { sortPairs: true });
console.log("Root:", tree.getRoot().toString('hex'));
