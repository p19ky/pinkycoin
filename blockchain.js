var forge = require("node-forge");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Transaction {
  /**
   * @param {string} fromAddress address from which the amount is transfered.
   * @param {string} toAddress address to which the amount is transfered.
   * @param {number} amount amount transfered.
   */
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
  }

  /**
   * Creates a SHA256 hash of the transaction
   * 
   * @returns {string} the calculated hash value
   */
  calculateHash() {
    return forge.md.sha256
      .create()
      .update(this.fromAddress + this.toAddress + this.amount)
      .digest()
      .toHex();
  }

  /**
   * Signs a transaction with the given signingKey (which is an Elliptic keypair
   * object that contains a private key). The signature is then stored inside the
   * transaction object and later stored on the blockchain.
   *
   * @param {string} signingKey the signingKey Object.
   */
  signTransaction(signingKey) {
    //Check if User has the access to the specific keys before signing the Transaction.
    // You can only send a transaction from the wallet that is linked to your
    // key. So here we check if the fromAddress matches your publicKey
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error(
        "Transaction cannot be signed because you have no privilege for this Transaction!"
      );
    }

    //Calculate the hash of this transaction
    const hashTx = this.calculateHash();
    //Sign transaction with the key
    const sig = signingKey.sign(hashTx, "base64");
    //Store signature inside the transaction object
    this.signature = sig.toDER("hex");
  }

  /**
   * Checks if the signature is valid (transaction has not been tampered with).
   * It uses the fromAddress as the public key.
   *
   * @returns {boolean} True if valid. False if not valid.
   */
  isValid() {
    // If the transaction doesn't have a from address we assume it's a
    // mining reward and that it's valid.
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("Missing signature of Transaction!");
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature)
  }
}

class Block {
  //timestamp - When the Block was created.
  //transactions - The information that is stored inside the Block. (Ex. In Case of a Cryptocurrency - details of transactions)
  //previousHash - String that contains the Hash value of the previous Block. (the Block behind this Block.)

  //this.hash - Conatins the Hash value of the current Block. (Unique Identifier for this Block on the Blockchain)
  //this.nonce - random number, nothing to do with the block, can be changed randomly.

/**
   * @param {number} timestamp
   * @param {Transaction[]} transactions
   * @param {string} previousHash
   */
  constructor(timestamp, transactions, previousHash = "") {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  /**
   * Returns the SHA256 representation of this Block
   *
   * @returns {string} the hash value
   */
  calculateHash() {
    return forge.md.sha256
      .create()
      .update(
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.data) +
          this.nonce
      )
      .digest()
      .toHex();
  }

  /**
   * Starts the mining process on the block. It changes the 'nonce' until the hash
   * of the block starts with enough zeros (= difficulty)
   *
   * @param {number} difficulty how many zeros should the hash value start with
   */
  mineBlock(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    console.log("Block mined: " + this.hash);
  }

  /**
   * Validates all the transactions inside this block (signature + hash) and
   * returns true if everything checks out. False if the block is invalid.
   *
   * @returns {boolean} True if all transactions are valid. False, if not.
   */
  hasValidTransaction() {
    for (const transaction of this.transactions)
      if (!transaction.isValid()) return false;

    return true;
  }
}

class Blockchain {
  //this.chain - the Blockchain.
  //this.difficulty - The difficulty for mining a new block.
  //this.miningReward - The Reward for the Miner.
  //this.pendingTransactions - List of Transactions that are pending so they can be added after the current processed Block is added.
  //First Block on a Blockchain - Genesis Block. (It is added manually)

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
  }

  //Creates the first ever Block inside the Blockchain.
  /**
   * @returns {Block} the Genesis Block.
   */
  createGenesisBlock() {
    return new Block(Date.parse("2021-01-01"), [], "0");
  }

  /**
   * Returns the latest block on the Blockchain. Useful when new Block is created and
   * the hash of previous Block is needed.
   *
   * @returns {Block[]} the last Block on the Blockchain
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  //Note: Cryptocurrencies are powered by a Peer to Peer Network
  //Which means that any attempt to increase the Mining Reward will be declined by other Participants of the Network.

  /**
   * Takes all the pending transactions, puts them in a Block and starts the
   * mining process. It also adds a transaction to send the mining reward to
   * the given address.
   *
   * @param {string} miningRewardAddress the address to which the reward will be sent.
   */
  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward
    );
    this.pendingTransactions.push(rewardTx);

    let block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    //In reality, miners choose specific pending transactions because
    //there are too many existent pending transactions at once. (Ex. In case of Bitcoin)

    block.mineBlock(this.difficulty);

    console.log("Block successfully mined!");
    this.chain.push(block);

    this.pendingTransactions = [];
  }

  /**
   * Add a new transaction to the list of pending transactions (to be added
   * next time the mining process starts). This verifies that the given
   * transaction is properly signed.
   *
   * @param {Transaction} transaction the new Transaction to be added.
   */
  addTransaction(transaction) {
    //Verify if there is a to and a from Address for the Transaction.
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    // Verify the transactiion
    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }
    
    //Validate transaction amount
    if (transaction.amount <= 0) {
      throw new Error('Transaction amount should be higher than 0');
    }
    
    // Making sure that the amount sent is not greater than existing balance
    if (this.getBalanceOfAddress(transaction.fromAddress) < transaction.amount) {
      throw new Error('Not enough balance');
    }

    this.pendingTransactions.push(transaction);
  }

  /**
   * Returns the balance of a given wallet address.
   *
   * @param {string} address the address of the wallet inside the Blockchain
   * @returns {number} The balance of the wallet
   */
  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address) {
          balance -= transaction.amount;
        }

        if (transaction.toAddress === address) {
          balance += transaction.amount;
        }
      }
    }

    return balance;
  }

  /**
   * Returns a list of all transactions that happened
   * to and from the given wallet address.
   *
   * @param  {string} address the address of the wallet
   * @return {Transaction[]} the list of transactions
   */
  getAllTransactionsForWallet(address) {
    const transactions = [];

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address || transaction.toAddress === address) {
          transactions.push(transaction);
        }
      }
    }

    return transactions;
  }

  /**
   * Loops over all the blocks in the chain and verify if they are properly
   * linked together and nobody has tampered with the hashes. By checking
   * the blocks it also verifies the (signed) transactions inside of them.
   *
   * @returns {boolean} True if Blockchain is valid. False, if not.
   */
  isChainValid() {
    // Check if the Genesis block hasn't been tampered with by comparing
    // the output of createGenesisBlock with the first block on our chain
    const realGenesis = JSON.stringify(this.createGenesisBlock());

    if (realGenesis !== JSON.stringify(this.chain[0])) {
      return false;
    }

    // Check the remaining blocks on the chain to see if there hashes and
    // signatures are correct
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
    }

    return true;
  }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
module.exports.Block = Block;
