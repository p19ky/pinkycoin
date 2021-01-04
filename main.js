const { Blockchain, Transaction } = require("./blockchain");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

// Your private key goes here
const myKey = ec.keyFromPrivate(
  "e4e87b840634d178a3e60183cde01a47f8eb848ff47a7982b941db855a5cdf17"
);

// From that we can calculate your public key (which doubles as your wallet address)
const myWalletAddress = myKey.getPublic("hex");

// Create new instance of Blockchain class
const pinkycoin = new Blockchain();

// Create a transaction & sign it with your key
const tx1 = new Transaction(myWalletAddress, "address2", 100);
tx1.signTransaction(myKey);
pinkycoin.addTransaction(tx1);

// Mine block
pinkycoin.minePendingTransactions(myWalletAddress);

// Create second transaction
const tx2 = new Transaction(myWalletAddress, "address1", 50);
tx2.signTransaction(myKey);
pinkycoin.addTransaction(tx2);

// Mine block
pinkycoin.minePendingTransactions(myWalletAddress);

console.log();
console.log(
  `Balance of user is ${pinkycoin.getBalanceOfAddress(myWalletAddress)}`
);

// Uncomment this line if you want to test tampering with the chain
// pinkycoin.chain[1].transactions[0].amount = 10;

// Check if the chain is valid
console.log();
console.log("Blockchain valid?", pinkycoin.isChainValid() ? "Yes" : "No");
