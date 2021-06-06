import { encode as b58encode, decode as b58decode } from "base58-universal";

function roomKey2Id(key) {
    const keyBin = b58decode(key);
    return b58encode(keyBin.subarray(0, 5));
}

export { roomKey2Id };
