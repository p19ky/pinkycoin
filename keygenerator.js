const EC = require("elliptic").ec;

//setting elliptic curve
const ec = new EC("secp256k1"); //secp256k1, also used for bitcoin wallets.

const key = ec.genKeyPair();
const publicKey = key.getPublic("hex");
const privateKey = key.getPrivate("hex");

console.log("\nPrivate key: (keep it secret!)", privateKey);
console.log("\nPublic key: (publicly available for transactions.)", publicKey);
