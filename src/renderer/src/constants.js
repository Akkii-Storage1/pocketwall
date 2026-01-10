export const INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Investment",
  "Gift",
  "Rental",
  "Refund",
  "Other",
];

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Travel",
  "Insurance",
  "Other",
];

// Transaction types - now includes transfer for moving money between accounts
export const TRANSACTION_TYPES = ["income", "expense", "transfer"];

// Transfer categories - for account-to-account movements
export const TRANSFER_CATEGORIES = [
  "Bank Transfer",
  "ATM Withdrawal",
  "Cash Deposit",
  "Credit Card Payment",
  "Investment Transfer",
  "Wallet Top-up",
  "Other Transfer",
];

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "GBP", label: "British Pound (£)", symbol: "£" },
  { code: "MYR", label: "Malaysian Ringgit (RM)", symbol: "RM" },
  { code: "SGD", label: "Singapore Dollar (S$)", symbol: "S$" },
  { code: "THB", label: "Thai Baht (฿)", symbol: "฿" },
  { code: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
  { code: "AED", label: "UAE Dirham (AED)", symbol: "AED" },
];

export const DEFAULT_EXCHANGE_RATES = {
  INR: 1,
  USD: 89.0, // Updated: 1 USD = ~89 INR (Nov 2025)
  EUR: 96.0, // 1 EUR = ~96 INR
  GBP: 112.0, // 1 GBP = ~112 INR
  MYR: 19.8, // 1 MYR = ~19.8 INR
  SGD: 66.0, // 1 SGD = ~66 INR
  THB: 2.5, // 1 THB = ~2.5 INR
  JPY: 0.59, // 1 JPY = ~0.59 INR
  AED: 24.2, // 1 AED = ~24.2 INR
};
