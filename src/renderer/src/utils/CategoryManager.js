/**
 * CategoryManager - Handle custom income/expense categories
 * - Default categories from constants.js
 * - User can add custom categories
 * - Stored in DataAdapter/localStorage
 */

import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';
import DataAdapter from './dataAdapter';

const CUSTOM_CATEGORIES_KEY = 'pocketwall_custom_categories';

// In-memory cache
let customCategories = {
    income: [],
    expense: []
};

// Load custom categories from storage
async function loadCustomCategories() {
    try {
        // Try DataAdapter first (Electron)
        if (window.api && window.api.getUserSettings) {
            const settings = await DataAdapter.getUserSettings();
            if (settings?.customCategories) {
                customCategories = settings.customCategories;
                return;
            }
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
        if (stored) {
            customCategories = JSON.parse(stored);
        }
    } catch (error) {
        console.warn('[CategoryManager] Failed to load custom categories:', error);
    }
}

// Save custom categories
async function saveCustomCategories() {
    try {
        // Save to DataAdapter (Electron)
        if (window.api && window.api.updateUserSettings) {
            const settings = await DataAdapter.getUserSettings() || {};
            settings.customCategories = customCategories;
            await DataAdapter.updateUserSettings(settings);
        }

        // Also save to localStorage as backup
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
    } catch (error) {
        console.warn('[CategoryManager] Failed to save custom categories:', error);
    }
}

// Initialize on module load
loadCustomCategories();

export const CategoryManager = {
    // Get all income categories (default + custom)
    getIncomeCategories() {
        const all = [...INCOME_CATEGORIES];
        customCategories.income.forEach(cat => {
            if (!all.includes(cat)) all.push(cat);
        });
        return all;
    },

    // Get all expense categories (default + custom)
    getExpenseCategories() {
        const all = [...EXPENSE_CATEGORIES];
        customCategories.expense.forEach(cat => {
            if (!all.includes(cat)) all.push(cat);
        });
        return all;
    },

    // Get custom categories only
    getCustomCategories() {
        return { ...customCategories };
    },

    // Add custom income category
    async addIncomeCategory(category) {
        const trimmed = category.trim();
        if (!trimmed) return false;

        // Check if already exists
        if (INCOME_CATEGORIES.includes(trimmed) || customCategories.income.includes(trimmed)) {
            return false; // Already exists
        }

        customCategories.income.push(trimmed);
        await saveCustomCategories();
        return true;
    },

    // Add custom expense category
    async addExpenseCategory(category) {
        const trimmed = category.trim();
        if (!trimmed) return false;

        // Check if already exists
        if (EXPENSE_CATEGORIES.includes(trimmed) || customCategories.expense.includes(trimmed)) {
            return false; // Already exists
        }

        customCategories.expense.push(trimmed);
        await saveCustomCategories();
        return true;
    },

    // Remove custom category (can't remove defaults)
    async removeIncomeCategory(category) {
        const index = customCategories.income.indexOf(category);
        if (index > -1) {
            customCategories.income.splice(index, 1);
            await saveCustomCategories();
            return true;
        }
        return false;
    },

    async removeExpenseCategory(category) {
        const index = customCategories.expense.indexOf(category);
        if (index > -1) {
            customCategories.expense.splice(index, 1);
            await saveCustomCategories();
            return true;
        }
        return false;
    },

    // Check if category is custom (can be deleted)
    isCustomCategory(category, type) {
        if (type === 'income') {
            return customCategories.income.includes(category);
        }
        return customCategories.expense.includes(category);
    },

    // Reload from storage
    async refresh() {
        await loadCustomCategories();
    }
};

export default CategoryManager;
