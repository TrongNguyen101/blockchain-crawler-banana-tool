require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const app = express();
const port = 3000;

const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);

// tool lỏ mù mắt
app.get("/", async (req, res) => {
  res.send("Banana crawler app");
});

app.get("/block/latest", async (req, res) => {
  try {
    const blockNumber = await provider.getBlock("latest");
    res.json({ success: true, latestBlock: blockNumber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/block/:blockNumber", async (req, res) => {
  try {
    let blockNumber = req.params.blockNumber;

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
      block.transactions.forEach((tx) => {
        if (
          tx.from.toLowerCase() === address ||
          (tx.to && tx.to.toLowerCase() === address)
        ) {
          transactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice.toString(),
            gasLimit: tx.gasLimit.toString(),
            blockNumber: tx.blockNumber,
          });
        }
      });
    }
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

app.listen(port, () => {
  console.log(`Server banana crawler is running on port ${port}`);
});
