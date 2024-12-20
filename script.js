document.addEventListener('DOMContentLoaded', () => {
    const expenseNameInput = document.getElementById('expense-name');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseCategorySelect = document.getElementById('expense-category');
    const addExpenseButton = document.getElementById('add-expense-btn');
    const budgetAmountElement = document.querySelector('.budget-amount');
    const recentExpensesContainer = document.querySelector('.recent-expenses');
    const updateBudgetButton = document.getElementById('update-budget-btn');
    const newBudgetInput = document.getElementById('new-budget');

    // Load initial budget and expenses from storage
    chrome.storage.local.get(['budget', 'expenses'], (data) => {
        // Show the remaining budget
        if (data.budget) {
            budgetAmountElement.textContent = `$${data.budget.toFixed(2)}`;
        }
        if (data.expenses) {
            data.expenses.forEach(displayExpense);
        }
    });

    // Add expense button click event
    addExpenseButton.addEventListener('click', () => {
        const name = expenseNameInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);
        const category = expenseCategorySelect.value;

        if (!name || isNaN(amount) || !category) {
            alert('Please fill in all fields.');
            return;
        }

        const expenseData = { name, amount, category };

        // Send the expense data to background.js
        chrome.runtime.sendMessage({ type: 'ADD_EXPENSE', ...expenseData }, (response) => {
            if (response.success) {
                budgetAmountElement.textContent = `$${response.budget.toFixed(2)}`;
                displayExpense(expenseData);
                clearInputs();
            }
        });
    });

    // Update budget button click event
    updateBudgetButton.addEventListener('click', () => {
        const newBudget = parseFloat(newBudgetInput.value);

        if (isNaN(newBudget) || newBudget <= 0) {
            alert('Please enter a valid budget amount.');
            return;
        }

        // Send the new budget to background.js
        chrome.runtime.sendMessage({ type: 'SET_BUDGET', budget: newBudget }, (response) => {
            if (response.success) {
                budgetAmountElement.textContent = `$${newBudget.toFixed(2)}`;
                newBudgetInput.value = ''; // Clear input field
                alert('Budget has been updated successfully!'); // Notify the user
            }
        });
    });

    // Function to display an expense in the UI
    function displayExpense(expense) {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';

        const expenseDetails = document.createElement('div');
        expenseDetails.className = 'expense-details';

        const icon = document.createElement('svg');
        icon.className = 'expense-icon';
        icon.innerHTML = `<path d="M0 0h24v24H0z" fill="none"/>
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>`;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = expense.name;

        expenseDetails.appendChild(icon);
        expenseDetails.appendChild(nameSpan);

        const amountSpan = document.createElement('span');
        amountSpan.className = 'expense-amount';
        amountSpan.textContent = `$${expense.amount.toFixed(2)}`;

        expenseItem.appendChild(expenseDetails);
        expenseItem.appendChild(amountSpan);

        recentExpensesContainer.appendChild(expenseItem);
    }

    // Clear input fields after adding an expense
    function clearInputs() {
        expenseNameInput.value = '';
        expenseAmountInput.value = '';
        expenseCategorySelect.value = '';
    }
});

// Handle expense addition
document.getElementById('add-expense-btn').addEventListener('click', () => {
    const expenseName = document.getElementById('expense-name').value;
    const expenseAmount = parseFloat(document.getElementById('expense-amount').value);
    const expenseCategory = document.getElementById('expense-category').value;

    if (expenseName && expenseAmount && expenseCategory) {
        // Send expense to background script for categorization
        chrome.runtime.sendMessage({
            type: "categorizeExpense",
            description: expenseName,
        }, (response) => {
            const category = response.category || expenseCategory; // Use AI category or user input

            // Save expense to localStorage (you could use an array of objects)
            const expense = { name: expenseName, amount: expenseAmount, category: category };
            let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
            expenses.push(expense);
            localStorage.setItem('expenses', JSON.stringify(expenses));

            // Update the UI with the new expense
            updateExpensesUI();

            // Optionally, give smart budget advice after adding an expense
            generateSmartBudgetAdvice(expenses);
        });
    } else {
        alert("Please fill in all fields.");
    }
});

// Function to display smart budget suggestions
function generateSmartBudgetAdvice(expenses) {
    chrome.runtime.sendMessage({
        type: "generateSmartBudget",
        expenses: expenses,
    }, (response) => {
        alert(response.suggestion);  // Display the smart budget suggestion
    });
}

// Function to update expenses in the UI
function updateExpensesUI() {
    const expenseList = document.getElementById('recent-expenses');
    expenseList.innerHTML = '';  // Clear current list

    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    expenses.forEach((expense, index) => {
        const expenseItem = document.createElement('div');
        expenseItem.classList.add('expense-item');
        expenseItem.innerHTML = `
            <span>${expense.name} - $${expense.amount} - ${expense.category}</span>
            <button class="remove-expense" data-index="${index}">🗑️</button>
        `;
        expenseList.appendChild(expenseItem);
    });

    // Add remove functionality for each expense
    document.querySelectorAll('.remove-expense').forEach((button) => {
        button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            removeExpense(index);
        });
    });
}

// Function to remove an expense
function removeExpense(index) {
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    expenses.splice(index, 1);
    localStorage.setItem('expenses', JSON.stringify(expenses));

    updateExpensesUI();  // Re-render the UI after removal
}

// Initialize the UI
updateExpensesUI();
