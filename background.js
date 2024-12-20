// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ADD_EXPENSE') {
        // Get the current budget from storage
        chrome.storage.local.get(['budget', 'expenses'], (data) => {
            let { budget = 0, expenses = [] } = data;

            // Deduct the expense amount from the budget
            budget -= message.amount;

            // Add the new expense to the list
            expenses.push({
                name: message.name,
                amount: message.amount,
                category: message.category,
            });

            // Save updated budget and expenses in storage
            chrome.storage.local.set({ budget, expenses }, () => {
                sendResponse({ success: true, budget });
            });
        });
        return true; // To ensure async sendResponse works
    }

    if (message.type === 'SET_BUDGET') {
        // Save the new budget in storage
        chrome.storage.local.set({ budget: message.budget }, () => {
            sendResponse({ success: true });
        });
        return true; // To ensure async sendResponse works
    }
});
// Function to generate smart budgeting advice
async function generateSmartBudget(expenses) {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const avgMonthlySpend = totalSpent / expenses.length;
    const suggestedBudget = avgMonthlySpend * 1.1;  // Suggest 10% higher budget
    return `We suggest setting a budget of $${suggestedBudget.toFixed(2)} for this month based on your recent expenses.`;
}

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "categorizeExpense") {
        categorizeExpense(request.description).then((category) => {
            sendResponse({ category });
        });
    } else if (request.type === "generateSmartBudget") {
        generateSmartBudget(request.expenses).then((suggestion) => {
            sendResponse({ suggestion });
        });
    }
    return true;  // Required for asynchronous responses
});
