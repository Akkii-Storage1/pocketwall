import DataAdapter from './dataAdapter';
import { detectRecurringBills } from './insights';

class NotificationManager {
    static async requestPermission() {
        if (!("Notification" in window)) {
            return false;
        }

        if (Notification.permission === "granted") {
            return true;
        }

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }

        return false;
    }

    static sendNotification(title, body, icon = null) {
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: icon || '/icon.png'
            });
        }
    }

    static async checkBillReminders() {
        try {
            const transactions = await DataAdapter.getTransactions();
            const recurringRules = await DataAdapter.getRecurringRules();

            const bills = detectRecurringBills(transactions, recurringRules || []);

            // Filter for bills due in 1-3 days
            const upcomingBills = bills.filter(b => b.daysUntilDue >= 0 && b.daysUntilDue <= 3);

            upcomingBills.forEach(bill => {
                // Check if we already notified today (to avoid spam)
                const key = `notified_bill_${bill.payee}_${bill.nextDate}`;
                const lastNotified = localStorage.getItem(key);

                if (!lastNotified) {
                    const dayText = bill.daysUntilDue === 0 ? 'today' : `in ${bill.daysUntilDue} days`;
                    this.sendNotification(
                        'Bill Reminder 🧾',
                        `Upcoming bill: ${bill.payee} (₹${bill.avgAmount}) is due ${dayText}.`
                    );
                    localStorage.setItem(key, new Date().toISOString());
                }
            });
        } catch (error) {
            console.error('Error checking bill reminders:', error);
        }
    }

    static async checkBudgetAlerts() {
        try {
            const [transactions, budgets] = await Promise.all([
                DataAdapter.getTransactions(),
                DataAdapter.getBudgets()
            ]);

            if (!budgets || Object.keys(budgets).length === 0) return;

            // Calculate spending per category for current month
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const expenses = transactions.filter(t =>
                t.type === 'expense' &&
                t.date.startsWith(currentMonth)
            );

            Object.entries(budgets).forEach(([category, limit]) => {
                if (!limit || limit <= 0) return;

                const spent = expenses
                    .filter(t => t.category === category)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                const percentage = (spent / limit) * 100;

                if (percentage >= 80) {
                    const threshold = percentage >= 100 ? '100' : (percentage >= 90 ? '90' : '80');
                    const key = `notified_budget_${category}_${currentMonth}_${threshold}`;
                    const lastNotified = localStorage.getItem(key);

                    if (!lastNotified) {
                        let title = 'Budget Alert ⚠️';
                        let body = '';

                        if (percentage >= 100) {
                            title = 'Budget Exceeded 🚨';
                            body = `You've exceeded your ${category} budget of ₹${limit}. Current: ₹${spent}`;
                        } else if (percentage >= 90) {
                            body = `You've used 90% of your ${category} budget.`;
                        } else {
                            body = `You've used 80% of your ${category} budget.`;
                        }

                        this.sendNotification(title, body);
                        localStorage.setItem(key, new Date().toISOString());
                    }
                }
            });
        } catch (error) {
            console.error('Error checking budget alerts:', error);
        }
    }

    static async checkPortfolioAlerts() {
        try {
            const [alerts, investments] = await Promise.all([
                DataAdapter.getAlerts(),
                DataAdapter.getInvestments()
            ]);

            const portfolioAlerts = alerts.filter(a => a.type === 'portfolio' && a.enabled);
            if (portfolioAlerts.length === 0 || investments.length === 0) return;

            // Calculate current portfolio value (simplified - using buyPrice)
            const totalInvested = investments.reduce((sum, inv) => {
                return sum + (parseFloat(inv.quantity) * parseFloat(inv.buyPrice || inv.pricePerShare || 0));
            }, 0);

            const currentValue = investments.reduce((sum, inv) => {
                return sum + (parseFloat(inv.quantity) * parseFloat(inv.currentPrice || inv.pricePerShare || 0));
            }, 0);

            const changePercentage = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

            portfolioAlerts.forEach(alert => {
                const { threshold, comparison } = alert.conditions;
                let triggered = false;

                if (comparison === 'below' && changePercentage < threshold) {
                    triggered = true;
                } else if (comparison === 'above' && changePercentage > threshold) {
                    triggered = true;
                }

                if (triggered) {
                    const key = `notified_portfolio_${alert.id}_${new Date().toISOString().slice(0, 10)}`;
                    const lastNotified = localStorage.getItem(key);

                    if (!lastNotified) {
                        const message = alert.message || `Portfolio ${comparison} ${threshold}%: Current ${changePercentage.toFixed(2)}%`;
                        this.sendNotification('Portfolio Alert 📊', message);
                        localStorage.setItem(key, new Date().toISOString());

                        // Update lastTriggered
                        alert.lastTriggered = new Date().toISOString();
                        DataAdapter.updateAlert(alert);
                    }
                }
            });
        } catch (error) {
            console.error('Error checking portfolio alerts:', error);
        }
    }

    static async checkStockPriceAlerts() {
        try {
            const [alerts, investments] = await Promise.all([
                DataAdapter.getAlerts(),
                DataAdapter.getInvestments()
            ]);

            const stockAlerts = alerts.filter(a => (a.type === 'stock' || a.type === 'stock_owned' || a.type === 'stock_watchlist') && a.enabled);
            if (stockAlerts.length === 0) return;

            stockAlerts.forEach(alert => {
                const { symbol, targetPrice, comparison } = alert.conditions;

                // For owned stocks, check against current investments
                if (alert.type === 'stock_owned' || alert.type === 'stock') {
                    const stock = investments.find(inv => inv.symbol === symbol);
                    if (!stock) return;

                    const currentPrice = parseFloat(stock.currentPrice || stock.pricePerShare || 0);
                    let triggered = false;

                    if (comparison === 'below' && currentPrice < targetPrice) {
                        triggered = true;
                    } else if (comparison === 'above' && currentPrice > targetPrice) {
                        triggered = true;
                    }

                    if (triggered) {
                        const key = `notified_stock_${alert.id}_${new Date().toISOString().slice(0, 10)}`;
                        const lastNotified = localStorage.getItem(key);

                        if (!lastNotified) {
                            const message = alert.message || `${symbol} is ${comparison} target price ₹${targetPrice}. Current: ₹${currentPrice}`;
                            this.sendNotification('Stock Price Alert 📈', message);
                            localStorage.setItem(key, new Date().toISOString());

                            // Update lastTriggered
                            alert.lastTriggered = new Date().toISOString();
                            DataAdapter.updateAlert(alert);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error checking stock price alerts:', error);
        }
    }

    static async checkGoalAlerts() {
        try {
            const [alerts, goals] = await Promise.all([
                DataAdapter.getAlerts(),
                DataAdapter.getGoals()
            ]);

            const goalAlerts = alerts.filter(a => a.type === 'goal' && a.enabled);
            if (goalAlerts.length === 0) return;

            const today = new Date();

            goalAlerts.forEach(alert => {
                const { goalId, milestones, daysBeforeDeadline } = alert.conditions;
                const goal = goals.find(g => g.id === goalId);

                if (!goal) return;

                const currentAmount = parseFloat(goal.currentAmount || 0);
                const targetAmount = parseFloat(goal.targetAmount || 1);
                const progress = (currentAmount / targetAmount) * 100;

                // Check milestone alerts
                if (milestones && Array.isArray(milestones)) {
                    milestones.forEach(milestone => {
                        if (progress >= milestone) {
                            const key = `notified_goal_milestone_${alert.id}_${milestone}`;
                            const lastNotified = localStorage.getItem(key);

                            if (!lastNotified) {
                                const message = alert.message || `Goal "${goal.name}" reached ${milestone}% milestone!`;
                                this.sendNotification('Goal Progress 🎯', message);
                                localStorage.setItem(key, new Date().toISOString());
                            }
                        }
                    });
                }

                // Check deadline alerts
                if (daysBeforeDeadline && goal.deadline) {
                    const deadline = new Date(goal.deadline);
                    const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                    if (daysUntil <= daysBeforeDeadline && daysUntil >= 0) {
                        const key = `notified_goal_deadline_${alert.id}_${daysUntil}`;
                        const lastNotified = localStorage.getItem(key);

                        if (!lastNotified) {
                            const message = alert.message || `Goal "${goal.name}" deadline in ${daysUntil} days!`;
                            this.sendNotification('Goal Deadline 📅', message);
                            localStorage.setItem(key, new Date().toISOString());
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error checking goal alerts:', error);
        }
    }

    static async checkDailySummary() {
        if (localStorage.getItem('enable_daily_summary') === 'false') return;

        try {
            const today = new Date().toISOString().slice(0, 10);
            const key = `notified_daily_summary_${today}`;
            if (localStorage.getItem(key)) return;

            // Check if it's evening (e.g., after 8 PM)
            const now = new Date();
            if (now.getHours() < 20) return;

            const transactions = await DataAdapter.getTransactions();
            const todayTxs = transactions.filter(t => t.date.startsWith(today));

            if (todayTxs.length === 0) return;

            const income = todayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const expense = todayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

            this.sendNotification(
                'Daily Summary 📅',
                `Income: ₹${income} | Expense: ₹${expense}\nNet: ₹${income - expense}`
            );
            localStorage.setItem(key, new Date().toISOString());
        } catch (error) {
            console.error('Error checking daily summary:', error);
        }
    }

    static async checkMarketStatus() {
        if (localStorage.getItem('enable_market_alerts') === 'false') return;

        try {
            const now = new Date();
            const day = now.getDay();
            if (day === 0 || day === 6) return; // Weekend

            const hour = now.getHours();
            const minute = now.getMinutes();
            const time = hour * 60 + minute;

            // Market Open (9:15 AM) -> 555 mins
            if (time >= 555 && time < 570) { // 9:15 - 9:30
                const key = `notified_market_open_${now.toISOString().slice(0, 10)}`;
                if (!localStorage.getItem(key)) {
                    this.sendNotification('Market Open 🔔', 'The stock market is now open.');
                    localStorage.setItem(key, new Date().toISOString());
                }
            }

            // Market Close (3:30 PM) -> 930 mins
            if (time >= 930 && time < 945) { // 15:30 - 15:45
                const key = `notified_market_close_${now.toISOString().slice(0, 10)}`;
                if (!localStorage.getItem(key)) {
                    this.sendNotification('Market Closed 🔔', 'The stock market has closed.');
                    localStorage.setItem(key, new Date().toISOString());
                }
            }
        } catch (error) {
            console.error('Error checking market status:', error);
        }
    }

    static async runChecks() {
        if (await this.requestPermission()) {
            await this.checkBillReminders();
            await this.checkBudgetAlerts();
            await this.checkPortfolioAlerts();
            await this.checkStockPriceAlerts();
            await this.checkGoalAlerts();
            await this.checkDailySummary();
            await this.checkMarketStatus();
        }
    }
}

export default NotificationManager;
