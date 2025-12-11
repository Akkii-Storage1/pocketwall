// This file will be used in the Electron Main process, not the Renderer (React)
// We need to set up IPC handlers to communicate between React and SQLite

// Simple JSON file-based database (no native modules required)
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dbPath;
let db = { transactions: [], settings: {} };

function initDatabase() {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'pocketwall-data.json');

  console.log('Initializing database at:', dbPath);

  // Load existing data or create new
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
    } catch (err) {
      console.error('Error loading database:', err);
      db = { transactions: [], settings: {} };
    }
  }

  // Ensure structure
  if (!db.transactions) db.transactions = [];
  if (!db.settings) db.settings = {};

  return db;
}

function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function getTransactions() {
  return db.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function addTransaction(transaction) {
  const newTransaction = {
    id: Date.now(),
    ...transaction,
    amount: parseFloat(transaction.amount)
  };
  db.transactions.push(newTransaction);
  saveDb();
  return newTransaction;
}

function deleteTransaction(id) {
  db.transactions = db.transactions.filter(t => t.id !== id);
  saveDb();
  return true;
}

module.exports = {
  initDatabase,
  getTransactions,
  addTransaction,
  deleteTransaction
};
