import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Color palette matching PocketWall theme
const COLORS = {
    primary: [0, 120, 212],      // #0078d4
    secondary: [139, 92, 246],   // Violet
    success: [16, 185, 129],     // Green
    danger: [239, 68, 68],       // Red
    dark: [45, 45, 48],          // #2d2d30
    light: [240, 240, 240],
    white: [255, 255, 255],
    text: [51, 51, 51]
};

class ExportManager {
    /**
     * Export data to Excel (.xlsx)
     * @param {Array} data - Array of objects to export
     * @param {String} filename - Name of the file without extension
     * @param {String} sheetName - Name of the worksheet
     */
    static exportToExcel(data, filename = 'export', sheetName = 'Sheet1') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }

    /**
     * Add professional header to PDF
     */
    static addHeader(doc, title, subtitle = '') {
        // Gradient-like header background
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, 210, 35, 'F');

        // App branding
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PocketWall', 14, 18);

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 28);

        // Date on right
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 196, 18, { align: 'right' });

        if (subtitle) {
            doc.text(subtitle, 196, 28, { align: 'right' });
        }

        // Reset text color
        doc.setTextColor(...COLORS.text);
    }

    /**
     * Add footer with page numbers
     */
    static addFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Page ${i} of ${pageCount}`,
                105, 290,
                { align: 'center' }
            );
            doc.text(
                'PocketWall - Your Personal Finance Manager',
                14, 290
            );
        }
    }

    /**
     * Export transactions to PDF table with professional styling
     * @param {Array} transactions - Array of transaction objects
     * @param {String} title - Title of the report
     */
    static exportTransactionsToPDF(transactions, title = 'Transaction Report') {
        const doc = new jsPDF();

        // Add header
        this.addHeader(doc, title, `${transactions.length} transactions`);

        // Calculate totals
        const totals = transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += parseFloat(t.amount) || 0;
            else acc.expense += parseFloat(t.amount) || 0;
            return acc;
        }, { income: 0, expense: 0 });

        // Summary cards
        const summaryY = 45;

        // Income card
        doc.setFillColor(...COLORS.success);
        doc.roundedRect(14, summaryY, 58, 20, 3, 3, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.text('Total Income', 43, summaryY + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`₹${totals.income.toLocaleString('en-IN')}`, 43, summaryY + 16, { align: 'center' });

        // Expense card
        doc.setFillColor(...COLORS.danger);
        doc.roundedRect(76, summaryY, 58, 20, 3, 3, 'F');
        doc.text('Total Expenses', 105, summaryY + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`₹${totals.expense.toLocaleString('en-IN')}`, 105, summaryY + 16, { align: 'center' });

        // Net card
        const net = totals.income - totals.expense;
        doc.setFillColor(...(net >= 0 ? COLORS.primary : COLORS.danger));
        doc.roundedRect(138, summaryY, 58, 20, 3, 3, 'F');
        doc.text('Net Balance', 167, summaryY + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`₹${net.toLocaleString('en-IN')}`, 167, summaryY + 16, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);

        // Table Data
        const tableColumn = ["Date", "Payee", "Category", "Type", "Amount", "Account"];
        const tableRows = [];

        transactions.forEach(t => {
            const transactionData = [
                new Date(t.date).toLocaleDateString('en-IN'),
                t.payee || '-',
                t.category,
                t.type.charAt(0).toUpperCase() + t.type.slice(1),
                `₹${parseFloat(t.amount).toLocaleString('en-IN')}`,
                t.accountName || 'Main'
            ];
            tableRows.push(transactionData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'striped',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                font: 'helvetica'
            },
            headStyles: {
                fillColor: COLORS.primary,
                textColor: COLORS.white,
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 30 },
                5: { halign: 'center', cellWidth: 25 }
            },
            didParseCell: (data) => {
                // Color income green, expense red
                if (data.column.index === 3 && data.section === 'body') {
                    if (data.cell.raw === 'Income') {
                        data.cell.styles.textColor = COLORS.success;
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Expense') {
                        data.cell.styles.textColor = COLORS.danger;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        // Add footer
        this.addFooter(doc);

        doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    /**
     * Export investments to PDF
     */
    static exportInvestmentsToPDF(investments, title = 'Investment Portfolio') {
        const doc = new jsPDF();

        this.addHeader(doc, title, `${investments.length} investments`);

        // Calculate totals
        const totals = investments.reduce((acc, inv) => {
            acc.invested += parseFloat(inv.buyPrice * inv.quantity) || 0;
            acc.current += parseFloat(inv.currentPrice * inv.quantity) || 0;
            return acc;
        }, { invested: 0, current: 0 });

        const pnl = totals.current - totals.invested;
        const pnlPercent = totals.invested > 0 ? ((pnl / totals.invested) * 100).toFixed(2) : 0;

        // Summary
        const summaryY = 45;
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(14, summaryY, 88, 20, 3, 3, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.text('Total Invested', 58, summaryY + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`₹${totals.invested.toLocaleString('en-IN')}`, 58, summaryY + 16, { align: 'center' });

        doc.setFillColor(...(pnl >= 0 ? COLORS.success : COLORS.danger));
        doc.roundedRect(108, summaryY, 88, 20, 3, 3, 'F');
        doc.text(`P&L (${pnlPercent}%)`, 152, summaryY + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')}`, 152, summaryY + 16, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);

        const tableColumn = ["Symbol", "Type", "Qty", "Buy Price", "Current", "P&L", "P&L %"];
        const tableRows = investments.map(inv => {
            const invested = inv.buyPrice * inv.quantity;
            const current = inv.currentPrice * inv.quantity;
            const itemPnl = current - invested;
            const itemPnlPercent = invested > 0 ? ((itemPnl / invested) * 100).toFixed(2) : 0;

            return [
                inv.symbol,
                inv.type || 'Stock',
                inv.quantity,
                `₹${parseFloat(inv.buyPrice).toLocaleString('en-IN')}`,
                `₹${parseFloat(inv.currentPrice).toLocaleString('en-IN')}`,
                `${itemPnl >= 0 ? '+' : ''}₹${itemPnl.toLocaleString('en-IN')}`,
                `${itemPnlPercent}%`
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
            columnStyles: {
                5: { halign: 'right' },
                6: { halign: 'right' }
            }
        });

        this.addFooter(doc);
        doc.save(`investment_portfolio_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    /**
     * Export goals to PDF
     */
    static exportGoalsToPDF(goals, title = 'Financial Goals') {
        const doc = new jsPDF();

        this.addHeader(doc, title, `${goals.length} goals`);

        const tableColumn = ["Goal", "Target", "Saved", "Progress", "Deadline"];
        const tableRows = goals.map(goal => {
            const progress = goal.targetAmount > 0
                ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
                : 0;

            return [
                goal.name,
                `₹${parseFloat(goal.targetAmount).toLocaleString('en-IN')}`,
                `₹${parseFloat(goal.currentAmount).toLocaleString('en-IN')}`,
                `${progress}%`,
                goal.deadline ? new Date(goal.deadline).toLocaleDateString('en-IN') : '-'
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white, fontStyle: 'bold' }
        });

        this.addFooter(doc);
        doc.save(`financial_goals_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    /**
     * Generate a summary report PDF
     * @param {Object} stats - Summary statistics
     * @param {Object} dateRange - Date range object with start and end
     */
    static generateSummaryReport(stats, dateRange) {
        const doc = new jsPDF();

        this.addHeader(doc, 'Financial Summary Report', `${dateRange.start} to ${dateRange.end}`);

        // Summary cards
        const cardY = 50;
        const cardHeight = 25;

        // Income
        doc.setFillColor(...COLORS.success);
        doc.roundedRect(14, cardY, 58, cardHeight, 3, 3, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.text('Total Income', 43, cardY + 10, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(stats.income, 43, cardY + 20, { align: 'center' });

        // Expenses
        doc.setFillColor(...COLORS.danger);
        doc.roundedRect(76, cardY, 58, cardHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Expenses', 105, cardY + 10, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(stats.expenses, 105, cardY + 20, { align: 'center' });

        // Savings
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(138, cardY, 58, cardHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Net Savings', 167, cardY + 10, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(stats.savings, 167, cardY + 20, { align: 'center' });

        // Additional stats
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        const statsY = 90;
        doc.text(`📊 Transaction Count: ${stats.count}`, 14, statsY);
        doc.text(`💰 Savings Rate: ${stats.savingsRate}%`, 14, statsY + 10);

        this.addFooter(doc);
        doc.save(`summary_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
}

export default ExportManager;

