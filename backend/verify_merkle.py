import hashlib

class MerkleTree:
    def __init__(self, leaves: list[bytes]):
        self.leaves = leaves
        self.layers = [self.leaves]
        while len(self.layers[-1]) > 1:
            self.layers.append(self._next_layer(self.layers[-1]))

    def _next_layer(self, layer: list[bytes]) -> list[bytes]:
        next_layer = []
        for i in range(0, len(layer), 2):
            if i + 1 < len(layer):
                # Sort pair to match merkletreejs sortPairs: true
                pair = sorted([layer[i], layer[i+1]])
                combined = pair[0] + pair[1]
                next_layer.append(hashlib.sha3_256(combined).digest())
            else:
                next_layer.append(layer[i])
        return next_layer

    def get_root(self) -> bytes:
        return self.layers[-1][0] if self.layers else b''

addresses = [
    "0000000000000000000000000000000000000000000000000000000000000001",
    "0000000000000000000000000000000000000000000000000000000000000002",
    "0000000000000000000000000000000000000000000000000000000000000003",
    "0000000000000000000000000000000000000000000000000000000000000004",
    "0000000000000000000000000000000000000000000000000000000000000005"
]

leaves = []
for addr in addresses:
    addr_bytes = bytes.fromhex(addr)
    leaves.append(hashlib.sha3_256(addr_bytes).digest())

tree = MerkleTree(leaves)
print(f"Root: {tree.get_root().hex()}")
