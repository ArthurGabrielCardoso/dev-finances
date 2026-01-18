// ============= CATEGORIES CONFIG =============

const Categories = {
    alimentacao: { icon: '🍔', label: 'Alimentação', color: '#FFE5B4' },
    transporte: { icon: '🚗', label: 'Transporte', color: '#B0E0E6' },
    lazer: { icon: '🎮', label: 'Lazer', color: '#FFB6C1' },
    saude: { icon: '💊', label: 'Saúde', color: '#98FB98' },
    educacao: { icon: '📚', label: 'Educação', color: '#DDA0DD' },
    salario: { icon: '💼', label: 'Salário', color: '#98FB98' },
    investimento: { icon: '📈', label: 'Investimento', color: '#F0E68C' },
    outros: { icon: '📦', label: 'Outros', color: '#D3D3D3' }
}

// ============= MODALS =============

const Modal = {
    open(){
        document.querySelector('.modal-overlay').classList.add('active')
    },
    close(){
        document.querySelector('.modal-overlay').classList.remove('active')
    }
}

const GoalModal = {
    open(){
        document.querySelector('#goal-modal').classList.add('active')
    },
    close(){
        document.querySelector('#goal-modal').classList.remove('active')
    }
}

// ============= STORAGE =============

const Storage = {
    get() {
        return JSON.parse(localStorage.getItem("dev.finances:transactions")) || []
    },
    set(transactions) {
        localStorage.setItem("dev.finances:transactions", JSON.stringify(transactions))
    },
    getGoals() {
        return JSON.parse(localStorage.getItem("dev.finances:goals")) || []
    },
    setGoals(goals) {
        localStorage.setItem("dev.finances:goals", JSON.stringify(goals))
    }
}

// ============= TRANSACTIONS =============

const Transaction = {
    all: Storage.get(),

    add(transaction){
        Transaction.all.push(transaction)
        App.reload()
    },

    remove(index) {
        Transaction.all.splice(index, 1)
        App.reload()
    },

    incomes() {
        let income = 0;
        Transaction.all.forEach(transaction => {
            if( transaction.amount > 0 ) {
                income += transaction.amount;
            }
        })
        return income;
    },

    expenses() {
        let expense = 0;
        Transaction.all.forEach(transaction => {
            if( transaction.amount < 0 ) {
                expense += transaction.amount;
            }
        })
        return expense;
    },

    total() {
        return Transaction.incomes() + Transaction.expenses();
    },

    getByCategory(category) {
        return Transaction.all.filter(t => t.category === category);
    },

    getCategoryStats() {
        const stats = {};
        Transaction.all.forEach(transaction => {
            if (transaction.amount < 0) { // Only expenses
                const cat = transaction.category || 'outros';
                if (!stats[cat]) {
                    stats[cat] = 0;
                }
                stats[cat] += Math.abs(transaction.amount);
            }
        });
        return stats;
    }
}

// ============= GOALS =============

const Goal = {
    all: Storage.getGoals(),

    add(goal) {
        Goal.all.push(goal)
        Storage.setGoals(Goal.all)
        GoalDOM.render()
    },

    remove(index) {
        Goal.all.splice(index, 1)
        Storage.setGoals(Goal.all)
        GoalDOM.render()
    },

    update(index, current) {
        Goal.all[index].current = current
        Storage.setGoals(Goal.all)
        GoalDOM.render()
    }
}

// ============= DOM MANIPULATION =============

const DOM = {
    transactionsContainer: document.querySelector('#data-table tbody'),
    filteredTransactions: [],

    addTransaction(transaction, index) {
        const tr = document.createElement('tr')
        tr.innerHTML = DOM.innerHTMLTransaction(transaction, index)
        tr.dataset.index = index

        DOM.transactionsContainer.appendChild(tr)
    },

    innerHTMLTransaction(transaction, index) {
        const CSSclass = transaction.amount > 0 ? "income" : "expense"
        const amount = Utils.formatCurrency(transaction.amount)
        const category = transaction.category || 'outros'
        const categoryInfo = Categories[category]

        const html = `
        <td>
            <span class="category-badge category-${category}">
                ${categoryInfo.icon} ${categoryInfo.label}
            </span>
        </td>
        <td class="description">${transaction.description}</td>
        <td class="${CSSclass}">${amount}</td>
        <td class="date">${transaction.date}</td>
        <td>
            <img onclick="Transaction.remove(${index})" src="./assets/assets/minus.svg" alt="Remover transação">
        </td>
        `

        return html
    },

    updateBalance() {
        document.getElementById('incomeDisplay').innerHTML = Utils.formatCurrency(Transaction.incomes())
        document.getElementById('expenseDisplay').innerHTML = Utils.formatCurrency(Transaction.expenses())
        document.getElementById('totalDisplay').innerHTML = Utils.formatCurrency(Transaction.total())
    },

    clearTransactions() {
        DOM.transactionsContainer.innerHTML = ""
    },

    renderTransactions(transactions = Transaction.all) {
        DOM.clearTransactions()
        transactions.forEach((transaction, index) => {
            DOM.addTransaction(transaction, index)
        })
    }
}

// ============= INSIGHTS =============

const Insights = {
    update() {
        const transactions = Transaction.all

        // Average daily expense
        const expenses = transactions.filter(t => t.amount < 0)
        const totalDays = this.getDaysCount(transactions)
        const avgDaily = expenses.length > 0 ?
            Math.abs(Transaction.expenses()) / (totalDays || 1) : 0

        document.getElementById('avgDaily').innerHTML = Utils.formatCurrency(avgDaily)

        // Max expense
        const maxExpense = Math.min(...transactions.map(t => t.amount), 0)
        document.getElementById('maxExpense').innerHTML = Utils.formatCurrency(maxExpense)

        // Max income
        const maxIncome = Math.max(...transactions.map(t => t.amount), 0)
        document.getElementById('maxIncome').innerHTML = Utils.formatCurrency(maxIncome)

        // Total transactions
        document.getElementById('totalTransactions').innerHTML = transactions.length
    },

    getDaysCount(transactions) {
        if (transactions.length === 0) return 1
        const dates = transactions.map(t => {
            const [day, month, year] = t.date.split('/')
            return new Date(year, month - 1, day)
        })
        const minDate = new Date(Math.min(...dates))
        const maxDate = new Date(Math.max(...dates))
        const diffTime = Math.abs(maxDate - minDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays || 1
    }
}

// ============= CHARTS =============

const Charts = {
    categoryChart: null,
    timelineChart: null,

    init() {
        this.createCategoryChart()
        this.createTimelineChart()
    },

    createCategoryChart() {
        const ctx = document.getElementById('categoryChart')
        if (!ctx) return

        const stats = Transaction.getCategoryStats()
        const categories = Object.keys(stats)
        const values = Object.values(stats)

        if (this.categoryChart) {
            this.categoryChart.destroy()
        }

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(cat => Categories[cat].label),
                datasets: [{
                    data: values,
                    backgroundColor: categories.map(cat => Categories[cat].color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        })
    },

    createTimelineChart() {
        const ctx = document.getElementById('timelineChart')
        if (!ctx) return

        const monthlyData = this.getMonthlyData()

        if (this.timelineChart) {
            this.timelineChart.destroy()
        }

        this.timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: monthlyData.incomes,
                        borderColor: '#49AA26',
                        backgroundColor: 'rgba(73, 170, 38, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Saídas',
                        data: monthlyData.expenses,
                        borderColor: '#e92929',
                        backgroundColor: 'rgba(233, 41, 41, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        })
    },

    getMonthlyData() {
        const monthlyStats = {}

        Transaction.all.forEach(transaction => {
            const [day, month, year] = transaction.date.split('/')
            const monthKey = `${month}/${year}`

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { income: 0, expense: 0 }
            }

            if (transaction.amount > 0) {
                monthlyStats[monthKey].income += transaction.amount
            } else {
                monthlyStats[monthKey].expense += Math.abs(transaction.amount)
            }
        })

        const labels = Object.keys(monthlyStats).sort((a, b) => {
            const [monthA, yearA] = a.split('/')
            const [monthB, yearB] = b.split('/')
            return new Date(yearA, monthA) - new Date(yearB, monthB)
        })

        return {
            labels: labels,
            incomes: labels.map(label => monthlyStats[label].income / 100),
            expenses: labels.map(label => monthlyStats[label].expense / 100)
        }
    }
}

// ============= GOALS DOM =============

const GoalDOM = {
    container: document.getElementById('goals-container'),

    render() {
        this.container.innerHTML = ''
        Goal.all.forEach((goal, index) => {
            this.addGoal(goal, index)
        })
    },

    addGoal(goal, index) {
        const percentage = Math.min((goal.current / goal.target) * 100, 100)

        const div = document.createElement('div')
        div.className = 'goal-card'
        div.innerHTML = `
            <div class="goal-header">
                <h3>${goal.name}</h3>
                <span class="goal-delete" onclick="Goal.remove(${index})">✕</span>
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="goal-amounts">
                    <span>${Utils.formatCurrency(goal.current)}</span>
                    <span>${Utils.formatCurrency(goal.target)}</span>
                </div>
                <div class="goal-percentage">${percentage.toFixed(0)}%</div>
            </div>
        `
        this.container.appendChild(div)
    }
}

// ============= FILTERS =============

const Filters = {
    init() {
        document.getElementById('searchTransaction').addEventListener('input', this.apply)
        document.getElementById('filterCategory').addEventListener('change', this.apply)
    },

    apply() {
        const searchTerm = document.getElementById('searchTransaction').value.toLowerCase()
        const category = document.getElementById('filterCategory').value

        let filtered = Transaction.all

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(searchTerm)
            )
        }

        // Filter by category
        if (category !== 'all') {
            filtered = filtered.filter(t => t.category === category)
        }

        DOM.renderTransactions(filtered)
    }
}

// ============= UTILS =============

const Utils = {
    formatAmount(value){
        value = Number(value.replace(/\,\./g, "")) * 100
        return value
    },

    formatDate(date) {
        const splittedDate = date.split("-")
        return `${splittedDate[2]}/${splittedDate[1]}/${splittedDate[0]}`
    },

    formatCurrency(value) {
        const signal = Number(value) < 0 ? "-" : ""
        value = String(value).replace(/\D/g, "")
        value = Number(value) / 100
        value = value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        })
       return signal + value
    }
}

// ============= FORMS =============

const Form = {
    description: document.querySelector('input#description'),
    amount: document.querySelector('input#amount'),
    date: document.querySelector('input#date'),
    category: document.querySelector('select#category'),

    getValues() {
        return {
            description: Form.description.value,
            amount: Form.amount.value,
            date: Form.date.value,
            category: Form.category.value || 'outros'
        }
    },

    validateFields() {
        const { description, amount, date } = Form.getValues()

        if( description.trim() === "" ||
            amount.trim() === "" ||
            date.trim() === "" ) {
                throw new Error("Por favor, preencha todos os campos")
        }
    },

    formatValues() {
        let { description, amount, date, category } = Form.getValues()

        amount = Utils.formatAmount(amount)
        date = Utils.formatDate(date)

        return {
            description,
            amount,
            date,
            category
        }
    },

    clearFields() {
        Form.description.value = ""
        Form.amount.value = ""
        Form.date.value = ""
        Form.category.value = ""
    },

    submit(event) {
        event.preventDefault()

        try {
            Form.validateFields()
            const transaction = Form.formatValues()
            Transaction.add(transaction)
            Form.clearFields()
            Modal.close()
        } catch (error) {
            alert(error.message)
        }
    }
}

const GoalForm = {
    name: document.querySelector('input#goalName'),
    amount: document.querySelector('input#goalAmount'),
    current: document.querySelector('input#goalCurrent'),

    getValues() {
        return {
            name: GoalForm.name.value,
            target: Number(GoalForm.amount.value) * 100,
            current: Number(GoalForm.current.value) * 100
        }
    },

    validateFields() {
        const { name, target } = GoalForm.getValues()

        if( name.trim() === "" || target <= 0 ) {
            throw new Error("Por favor, preencha todos os campos corretamente")
        }
    },

    clearFields() {
        GoalForm.name.value = ""
        GoalForm.amount.value = ""
        GoalForm.current.value = "0"
    },

    submit(event) {
        event.preventDefault()

        try {
            GoalForm.validateFields()
            const goal = GoalForm.getValues()
            Goal.add(goal)
            GoalForm.clearFields()
            GoalModal.close()
        } catch (error) {
            alert(error.message)
        }
    }
}

// ============= APP =============

const App = {
    init() {
        Transaction.all.forEach(DOM.addTransaction)
        DOM.updateBalance()
        Storage.set(Transaction.all)

        // Initialize new features
        Insights.update()
        Charts.init()
        GoalDOM.render()
        Filters.init()
    },

    reload() {
        DOM.clearTransactions()
        Transaction.all.forEach(DOM.addTransaction)
        DOM.updateBalance()
        Storage.set(Transaction.all)

        // Update new features
        Insights.update()
        Charts.init()
    }
}

App.init()
