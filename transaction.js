const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    from: String,
    to: String,
    value: String,
    gasPrice: String,
    gasLimit: String,
    blockNumber: Number,
    timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;