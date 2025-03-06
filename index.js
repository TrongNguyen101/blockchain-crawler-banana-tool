require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Transaction = require("./transaction");
const Block = require("./blockSchema");
const { axios } = require("axios");
const app = express();
const port = 3000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);

app.get("/block/latest", async (req, res) => {
  try {
    const blockNumber = await provider.getBlock("latest");
    const blockIsExist = await Block.findOne({ blockNumber: blockNumber.number });

    if (blockIsExist) {
      return res.json({ success: true, latestBlock: blockIsExist });
    }
    const blockData = new Block({
      blockNumber: blockNumber.number,
      hash: blockNumber.hash,
      miner: blockNumber.miner,
      gasUsed: blockNumber.gasUsed.toString(),
      gasLimit: blockNumber.gasLimit.toString(),
      timestamp: new Date(blockNumber.timestamp * 1000),
      transactions: blockNumber.transactions.map((tx) => tx.hash),
    });

    await blockData.save();

    res.json({ success: true, latestBlock: blockNumber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/block/:blockNumber", async (req, res) => {
  try {
    let blockNumber = req.params.blockNumber;

    const isBlockExist = await Block.findOne({ blockNumber: blockNumber });
    
    if (isBlockExist) {
      return res.json({ success: true, block: isBlockExist });
    }

    if (isNaN(blockNumber)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid block number" });
    }

    blockNumber = parseInt(blockNumber, 10);
    const hexBlockNumber = `0x${blockNumber.toString(16)}`;
    const block = await provider.send("eth_getBlockByNumber", [
      hexBlockNumber,
      true,
    ]);

    if (!block) {
      return res.status(404).json({ success: false, error: "Block not found" });
    }

    const blockData = new Block({ 
      blockNumber: block.number,
      hash: block.hash,
      miner: block.miner,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      timestamp: new Date(block.timestamp * 1000),
      transactions: block.transactions.map((tx) => tx.hash),
    });

    await blockData.save();

    res.json({ success: true, block });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/transaction/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const latestBlock = await provider.getBlockNumber();
    const transactions = [];

    for (let i = latestBlock; i > latestBlock - 10; i--) {
      const block = await provider.getBlockWithTransactions(i);
      for (let tx of block.transactions) {
        if (
          tx.from.toLowerCase() === address ||
          (tx.to && tx.to.toLowerCase() === address)
        ) {
          const txData = {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice.toString(),
            gasLimit: tx.gasLimit.toString(),
            blockNumber: tx.blockNumber,
          };
          await Transaction.findOneAndUpdate({ hash: tx.hash }, txData, {
            upsert: true,
          });

          transactions.push(txData);
        }
      }
    }
    res.json({ success: true, transaction: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/transaction/stored/:address", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ from: req.params.address }, { to: req.params.address }],
    }).sort({ blockNumber: -1 });
    res.json({ success: true, transaction: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/balance/:address", async (req, res) => {
  try {
    const address = req.params.address;
    if (ethers.utils.isAddress(address) === false) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }
    const balanceWei = await provider.getBalance(address);
    const balanceETH = ethers.utils.formatEther(balanceWei);

    res.json({ success: true, address: address, balance: balanceETH });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/block/:block", async (req, res) => {
  try {
    const block = req.params.block;
    const blockData = await axios.get(
      `https://eth.blockscout.com/api/v2/blocks?type=${block}`
    );

    res.json({ success: true, block: blockData.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server banana crawler is running on port ${port}`);
});
