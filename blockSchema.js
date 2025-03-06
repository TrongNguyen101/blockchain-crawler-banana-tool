const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
    blockNumber: { type: Number, unique: true, required: true },
    hash: { type: String, required: true },
    miner: String,
    gasUsed: String,
    gasLimit: String,
    timestamp: Date,
    transactions: [String],
}, { timestamps: true });

const Block = mongoose.model('Block', blockSchema);

module.exports = Block;