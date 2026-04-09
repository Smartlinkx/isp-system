import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5050/api'
const TODAY = new Date().toISOString().slice(0, 10)

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'customers', label: 'Customers' },
  { key: 'ledger', label: 'Customer 360' },
  { key: 'collections', label: 'Collections' },
  { key: 'payments', label: 'Payments' },
  { key: 'devices', label: 'Devices' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'sms', label: 'SMS' },
  { key: 'accounting', label: 'Accounting' }
]

const VIEW_TITLES = {
  dashboard: 'Network Dashboard',
  customers: 'Customer Management',
  ledger: 'Customer 360 View',
  collections: 'Collections Center',
  payments: 'Payments & Receipts',
  devices: 'Devices & Installations',
  expenses: 'Expenses',
  sms: 'SMS Operations',
  accounting: 'Accounting Reports'
}

function formatCurrency(value) {
  return `₱${Number(value || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-CA')
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPlanLabel(planLike) {
  if (!planLike) return '-'
  return planLike.plan_name || planLike.speed_profile || planLike.plan_code || '-'
}

function KpiCard({ label, value, tone = 'blue', subtext }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  )
}

function ViewCard({ title, subtitle, action, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function StatusBadge({ children, tone = 'default' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [customer360Tab, setCustomer360Tab] = useState('overview')

  const [plans, setPlans] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [receipts, setReceipts] = useState([])
  const [ledger, setLedger] = useState(null)
  const [customerDevices, setCustomerDevices] = useState([])

  const [collectionsSummary, setCollectionsSummary] = useState({
    customers_due_today: 0,
    amount_due_today: 0,
    customers_overdue: 0,
    amount_overdue: 0
  })
  const [dueTodayCustomers, setDueTodayCustomers] = useState([])
  const [overdueCustomers, setOverdueCustomers] = useState([])

  const [arAging, setArAging] = useState({
    summary: {
      current_amount: 0,
      bucket_1_30: 0,
      bucket_31_60: 0,
      bucket_61_90: 0,
      bucket_90_plus: 0,
      total_balance: 0
    },
    customers: []
  })

  const [smsPreview, setSmsPreview] = useState({
    due_soon_3d: [],
    due_today: [],
    final_notice: []
  })
  const [smsLogs, setSmsLogs] = useState([])
  const [loadingSmsRun, setLoadingSmsRun] = useState(false)

  const [expenseAccounts, setExpenseAccounts] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expenseSummary, setExpenseSummary] = useState([])
  const [loadingExpense, setLoadingExpense] = useState(false)

  const [expenseForm, setExpenseForm] = useState({
    expense_date: TODAY,
    payee_name: '',
    reference_no: '',
    description: '',
    expense_account_id: '',
    payment_account_id: '',
    amount: '',
    created_by: 'SYSTEM'
  })

  const [deviceAssignments, setDeviceAssignments] = useState([])
  const [loadingDevice, setLoadingDevice] = useState(false)

  const [deviceForm, setDeviceForm] = useState({
    customer_id: '',
    device_type: 'ONU',
    brand_model: '',
    serial_no: '',
    mac_address: '',
    assigned_date: TODAY,
    technician_name: '',
    notes: ''
  })

  const [journalEntries, setJournalEntries] = useState([])
  const [generalLedger, setGeneralLedger] = useState([])
  const [trialBalance, setTrialBalance] = useState([])
  const [incomeStatement, setIncomeStatement] = useState({
    income_accounts: [],
    expense_accounts: [],
    total_income: 0,
    total_expenses: 0,
    net_income: 0
  })
  const [balanceSheet, setBalanceSheet] = useState({
    assets: [],
    liabilities: [],
    equity: [],
    current_net_income: 0,
    total_assets: 0,
    total_liabilities: 0,
    total_equity_with_income: 0
  })

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [message, setMessage] = useState('')
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [bulkCsvFile, setBulkCsvFile] = useState(null)
  const [loadingBulkUpload, setLoadingBulkUpload] = useState(false)
  const [bulkPlanCsvFile, setBulkPlanCsvFile] = useState(null)
  const [loadingBulkPlanUpdate, setLoadingBulkPlanUpdate] = useState(false)
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [loadingEditCustomer, setLoadingEditCustomer] = useState(false)
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false)
  const [loadingPlanChange, setLoadingPlanChange] = useState(false)
  const [planChangeForm, setPlanChangeForm] = useState({
    new_plan_id: '',
    effective_date: TODAY,
    remarks: ''
  })
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: '',
    account_no: '',
    full_name: '',
    company_name: '',
    service_address: '',
    billing_address: '',
    mobile_no: '',
    email: '',
    status: 'ACTIVE',
    date_applied: TODAY,
    notes: ''
  })

  const [customerForm, setCustomerForm] = useState({
    account_no: '',
    full_name: '',
    service_address: '',
    billing_address: '',
    mobile_no: '',
    email: '',
    status: 'ACTIVE',
    date_applied: TODAY,
    notes: '',
    plan_id: '' // ✅ NEW
  })

  const [paymentForm, setPaymentForm] = useState({
    customer_id: '',
    payment_date: TODAY,
    amount: '',
    payment_method: 'CASH',
    reference_no: '',
    remarks: ''
  })

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerStatusFilter, setCustomerStatusFilter] = useState('ALL')

  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL')

  const [paymentSearch, setPaymentSearch] = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL')

  const [expenseSearch, setExpenseSearch] = useState('')
  const [smsLogSearch, setSmsLogSearch] = useState('')
  const [smsStatusFilter, setSmsStatusFilter] = useState('ALL')

  const currentMonthKey = TODAY.slice(0, 7)

  const activeCustomersCount = useMemo(
    () => customers.filter((customer) => customer.status === 'ACTIVE').length,
    [customers]
  )

  const assignedDevicesCount = useMemo(
    () => deviceAssignments.filter((device) => device.status === 'ASSIGNED').length,
    [deviceAssignments]
  )

  const monthCollections = useMemo(
    () =>
      payments
        .filter((payment) => String(payment.payment_date || '').slice(0, 7) === currentMonthKey)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments, currentMonthKey]
  )

  const monthExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => String(expense.expense_date || '').slice(0, 7) === currentMonthKey)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses, currentMonthKey]
  )

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const haystack = `${customer.account_no} ${customer.full_name} ${customer.mobile_no || ''} ${customer.plan_name || ''} ${customer.plan_code || ''} ${customer.speed_profile || ''}`.toLowerCase()
      const matchesSearch = haystack.includes(customerSearch.toLowerCase())
      const matchesStatus = customerStatusFilter === 'ALL' || customer.status === customerStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [customers, customerSearch, customerStatusFilter])

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const haystack = `${invoice.invoice_no} ${invoice.full_name} ${invoice.account_no || ''} ${invoice.cycle_code || ''}`.toLowerCase()
      const matchesSearch = haystack.includes(invoiceSearch.toLowerCase())
      const matchesStatus = invoiceStatusFilter === 'ALL' || invoice.status === invoiceStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, invoiceSearch, invoiceStatusFilter])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const haystack = `${payment.payment_no} ${payment.account_no || ''} ${payment.full_name || ''} ${payment.reference_no || ''}`.toLowerCase()
      return haystack.includes(paymentSearch.toLowerCase())
    })
  }, [payments, paymentSearch])

  const filteredDevices = useMemo(() => {
    return deviceAssignments.filter((device) => {
      const haystack = `${device.assignment_no} ${device.account_no || ''} ${device.full_name || ''} ${device.device_type || ''} ${device.brand_model || ''} ${device.serial_no || ''} ${device.mac_address || ''}`.toLowerCase()
      const matchesSearch = haystack.includes(deviceSearch.toLowerCase())
      const matchesStatus = deviceStatusFilter === 'ALL' || device.status === deviceStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [deviceAssignments, deviceSearch, deviceStatusFilter])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const haystack = `${expense.expense_no} ${expense.payee_name || ''} ${expense.reference_no || ''} ${expense.description || ''} ${expense.expense_account_name || ''}`.toLowerCase()
      return haystack.includes(expenseSearch.toLowerCase())
    })
  }, [expenses, expenseSearch])

  const filteredSmsLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      const haystack = `${log.sms_no} ${log.sms_type || ''} ${log.account_no || ''} ${log.full_name || ''} ${log.mobile_no || ''}`.toLowerCase()
      const matchesSearch = haystack.includes(smsLogSearch.toLowerCase())
      const matchesStatus = smsStatusFilter === 'ALL' || log.provider_status === smsStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [smsLogs, smsLogSearch, smsStatusFilter])

  const loadPlans = async () => {
    const res = await fetch(`${API_BASE}/plans`)
    const data = await res.json()
    if (data.success) setPlans(data.data)
  }

  const loadCustomers = async () => {
    const res = await fetch(`${API_BASE}/customers`)
    const data = await res.json()
    if (data.success) setCustomers(data.data)
  }

  const loadInvoices = async () => {
    const res = await fetch(`${API_BASE}/invoices`)
    const data = await res.json()
    if (data.success) setInvoices(data.data)
  }

  const loadPayments = async () => {
    const res = await fetch(`${API_BASE}/payments`)
    const data = await res.json()
    if (data.success) setPayments(data.data)
  }

  const loadReceipts = async () => {
    const res = await fetch(`${API_BASE}/official-receipts`)
    const data = await res.json()
    if (data.success) setReceipts(data.data)
  }

  const loadLedger = async (customerId) => {
    if (!customerId) {
      setLedger(null)
      return
    }
    const res = await fetch(`${API_BASE}/customers/${customerId}/ledger`)
    const data = await res.json()
    if (data.success) setLedger(data.data)
  }

  const loadCustomerDevices = async (customerId) => {
    if (!customerId) {
      setCustomerDevices([])
      return
    }
    const res = await fetch(`${API_BASE}/customers/${customerId}/device-assignments`)
    const data = await res.json()
    if (data.success) setCustomerDevices(data.data)
  }

  const loadCollectionsSummary = async () => {
    const res = await fetch(`${API_BASE}/collections/summary`)
    const data = await res.json()
    if (data.success) setCollectionsSummary(data.data)
  }

  const loadDueTodayCustomers = async () => {
    const res = await fetch(`${API_BASE}/collections/due-today`)
    const data = await res.json()
    if (data.success) setDueTodayCustomers(data.data)
  }

  const loadOverdueCustomers = async () => {
    const res = await fetch(`${API_BASE}/collections/overdue`)
    const data = await res.json()
    if (data.success) setOverdueCustomers(data.data)
  }

  const loadArAging = async () => {
    const res = await fetch(`${API_BASE}/ar-aging`)
    const data = await res.json()
    if (data.success) setArAging(data.data)
  }

  const loadSmsPreview = async () => {
    const res = await fetch(`${API_BASE}/sms/preview`)
    const data = await res.json()
    if (data.success) setSmsPreview(data.data)
  }

  const loadSmsLogs = async () => {
    const res = await fetch(`${API_BASE}/sms/logs`)
    const data = await res.json()
    if (data.success) setSmsLogs(data.data)
  }

  const loadExpenseAccounts = async () => {
    const res = await fetch(`${API_BASE}/accounts/expense-accounts`)
    const data = await res.json()
    if (data.success) setExpenseAccounts(data.data)
  }

  const loadPaymentAccounts = async () => {
    const res = await fetch(`${API_BASE}/accounts/payment-accounts`)
    const data = await res.json()
    if (data.success) setPaymentAccounts(data.data)
  }

  const loadExpenses = async () => {
    const res = await fetch(`${API_BASE}/expenses`)
    const data = await res.json()
    if (data.success) setExpenses(data.data)
  }

  const loadExpenseSummary = async () => {
    const res = await fetch(`${API_BASE}/expenses/summary`)
    const data = await res.json()
    if (data.success) setExpenseSummary(data.data)
  }

  const loadDeviceAssignments = async () => {
    const res = await fetch(`${API_BASE}/device-assignments`)
    const data = await res.json()
    if (data.success) setDeviceAssignments(data.data)
  }

  const loadJournalEntries = async () => {
    const res = await fetch(`${API_BASE}/journal-entries`)
    const data = await res.json()
    if (data.success) setJournalEntries(data.data)
  }

  const loadGeneralLedger = async () => {
    const res = await fetch(`${API_BASE}/general-ledger`)
    const data = await res.json()
    if (data.success) setGeneralLedger(data.data)
  }

  const loadTrialBalance = async () => {
    const res = await fetch(`${API_BASE}/trial-balance`)
    const data = await res.json()
    if (data.success) setTrialBalance(data.data)
  }

  const loadIncomeStatement = async () => {
    const res = await fetch(`${API_BASE}/income-statement`)
    const data = await res.json()
    if (data.success) setIncomeStatement(data.data)
  }

  const loadBalanceSheet = async () => {
    const res = await fetch(`${API_BASE}/balance-sheet`)
    const data = await res.json()
    if (data.success) setBalanceSheet(data.data)
  }

  const loadAll = async () => {
    try {
      await Promise.all([
        loadPlans(),
        loadCustomers(),
        loadInvoices(),
        loadPayments(),
        loadReceipts(),
        loadCollectionsSummary(),
        loadDueTodayCustomers(),
        loadOverdueCustomers(),
        loadArAging(),
        loadSmsPreview(),
        loadSmsLogs(),
        loadExpenseAccounts(),
        loadPaymentAccounts(),
        loadExpenses(),
        loadExpenseSummary(),
        loadDeviceAssignments(),
        loadJournalEntries(),
        loadGeneralLedger(),
        loadTrialBalance(),
        loadIncomeStatement(),
        loadBalanceSheet()
      ])
    } catch (error) {
      console.error(error)
      setMessage('Failed to load some data.')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      loadLedger(selectedCustomerId)
      loadCustomerDevices(selectedCustomerId)
    } else {
      setLedger(null)
      setCustomerDevices([])
    }
  }, [selectedCustomerId])

  const handleCustomerChange = (e) => {
    const { name, value } = e.target
    setCustomerForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePaymentChange = (e) => {
    const { name, value } = e.target
    setPaymentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleExpenseChange = (e) => {
    const { name, value } = e.target
    setExpenseForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDeviceChange = (e) => {
    const { name, value } = e.target
    setDeviceForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditCustomerChange = (e) => {
    const { name, value } = e.target
    setEditCustomerForm((prev) => ({ ...prev, [name]: value }))
  }

  const openEditCustomerModal = async () => {
    if (!selectedCustomerId) return

    try {
      const res = await fetch(`${API_BASE}/customers/${selectedCustomerId}`)
      const data = await res.json()

      if (data.success) {
        setEditCustomerForm({
          id: data.data.id,
          account_no: data.data.account_no || '',
          full_name: data.data.full_name || '',
          company_name: data.data.company_name || '',
          service_address: data.data.service_address || '',
          billing_address: data.data.billing_address || '',
          mobile_no: data.data.mobile_no || '',
          email: data.data.email || '',
          status: data.data.status || 'ACTIVE',
          date_applied: data.data.date_applied ? String(data.data.date_applied).slice(0, 10) : TODAY,
          notes: data.data.notes || ''
        })
        setShowEditCustomerModal(true)
      } else {
        setMessage(data.message || 'Failed to load customer details.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Failed to load customer details.')
    }
  }

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault()
    setLoadingEditCustomer(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/customers/${editCustomerForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCustomerForm)
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Customer updated successfully.')
        setShowEditCustomerModal(false)

        await Promise.all([
          loadCustomers(),
          loadLedger(selectedCustomerId)
        ])
      } else {
        setMessage(data.message || 'Failed to update customer.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Customer update request failed.')
    } finally {
      setLoadingEditCustomer(false)
    }
  }

  const handlePlanChangeFormChange = (e) => {
    const { name, value } = e.target
    setPlanChangeForm((prev) => ({ ...prev, [name]: value }))
  }

  const openPlanChangeModal = () => {
    if (!ledger?.current_service) return

    setPlanChangeForm({
      new_plan_id: '',
      effective_date: TODAY,
      remarks: ''
    })
    setShowPlanChangeModal(true)
  }

  const handlePlanChangeSubmit = async (e) => {
    e.preventDefault()

    if (!selectedCustomerId) return

    setLoadingPlanChange(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/customers/${selectedCustomerId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan_id: Number(planChangeForm.new_plan_id),
          effective_date: planChangeForm.effective_date,
          remarks: planChangeForm.remarks
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage(data.message || 'Plan changed successfully.')
        setShowPlanChangeModal(false)

        await Promise.all([
          loadCustomers(),
          loadLedger(selectedCustomerId),
          loadInvoices(),
          loadCollectionsSummary(),
          loadDueTodayCustomers(),
          loadOverdueCustomers(),
          loadArAging()
        ])
      } else {
        setMessage(data.message || 'Failed to change plan.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Plan change request failed.')
    } finally {
      setLoadingPlanChange(false)
    }
  }

  const openCustomerLedger = (customerId) => {
    setActiveView('ledger')
    setCustomer360Tab('overview')
    setSelectedCustomerId(String(customerId))
  }

  const handleRunSmsNow = async () => {
    setLoadingSmsRun(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/sms/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (data.success) {
        const smsData = data.data || {}
        setMessage(
          `SMS cycle completed. Due Soon: ${smsData.due_soon_sent || 0}, Due Today: ${smsData.due_today_sent || 0}, Final Notice: ${smsData.final_notice_sent || 0}`
        )

        await Promise.all([
          loadSmsPreview(),
          loadSmsLogs(),
          loadCollectionsSummary(),
          loadDueTodayCustomers(),
          loadOverdueCustomers(),
          loadArAging()
        ])
      } else {
        setMessage(data.message || 'Failed to run SMS cycle.')
      }
    } catch (error) {
      console.error(error)
      setMessage('SMS run request failed.')
    } finally {
      setLoadingSmsRun(false)
    }
  }

const parseCsvLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

const parseCsvTextToRows = (csvText) => {
  const cleanText = String(csvText || '').replace(/^\uFEFF/, '')
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headerIndex = lines.findIndex((line) => {
    const lowered = line.toLowerCase()
    return (
      lowered.includes('account_no') &&
      lowered.includes('full_name') &&
      lowered.includes('service_address')
    )
  })

  if (headerIndex === -1) {
    throw new Error('CSV header not found. Required columns: account_no, full_name, service_address')
  }

  const headers = parseCsvLine(lines[headerIndex]).map((header) => header.trim())
  const dataLines = lines.slice(headerIndex + 1)

  return dataLines
    .map((line) => parseCsvLine(line))
    .filter((columns) => columns.some((value) => String(value || '').trim() !== ''))
    .map((columns) => {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = columns[index] ?? ''
      })
      return row
    })
}

const parsePlanUpdateCsvTextToRows = (csvText) => {
  const cleanText = String(csvText || '').replace(/^\uFEFF/, '')
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headerIndex = lines.findIndex((line) => {
    const lowered = line.toLowerCase()
    return (
      lowered.includes('account_no') &&
      (
        lowered.includes('new_plan_code') ||
        lowered.includes('plan_key') ||
        lowered.includes('new_plan_id') ||
        lowered.includes('plan_id')
      )
    )
  })

  if (headerIndex === -1) {
    throw new Error('CSV header not found. Required columns: account_no and new_plan_code (or plan_key / new_plan_id)')
  }

  const headers = parseCsvLine(lines[headerIndex]).map((header) => header.trim())
  const dataLines = lines.slice(headerIndex + 1)

  return dataLines
    .map((line) => parseCsvLine(line))
    .filter((columns) => columns.some((value) => String(value || '').trim() !== ''))
    .map((columns) => {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = columns[index] ?? ''
      })
      return row
    })
}

const handleBulkPlanCsvUpload = async () => {
  if (!bulkPlanCsvFile) {
    setMessage('Please choose a bulk plan update CSV file first.')
    return
  }

  setLoadingBulkPlanUpdate(true)
  setMessage('')

  try {
    const csvText = await bulkPlanCsvFile.text()
    const rows = parsePlanUpdateCsvTextToRows(csvText)

    if (rows.length === 0) {
      setMessage('No valid rows found in bulk plan update CSV.')
      return
    }

    const res = await fetch(`${API_BASE}/customers/bulk-change-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    })

    const data = await res.json()

    if (data.success) {
      const summary = data.data || {}
      setMessage(
        `Bulk plan update completed. Updated: ${summary.updated_count || 0}, Skipped: ${summary.skipped_count || 0}`
      )
      setBulkPlanCsvFile(null)

      await Promise.all([
        loadCustomers(),
        loadInvoices(),
        loadCollectionsSummary(),
        loadDueTodayCustomers(),
        loadOverdueCustomers(),
        loadArAging()
      ])

      if (selectedCustomerId) {
        await loadLedger(selectedCustomerId)
      }
    } else {
      setMessage(data.message || 'Bulk plan update failed.')
    }
  } catch (error) {
    console.error(error)
    setMessage(error.message || 'Bulk plan update request failed.')
  } finally {
    setLoadingBulkPlanUpdate(false)
  }
}

const handleBulkCsvUpload = async () => {
  if (!bulkCsvFile) {
    setMessage('Please choose a CSV file first.')
    return
  }

  setLoadingBulkUpload(true)
  setMessage('')

  try {
    const csvText = await bulkCsvFile.text()
    const rows = parseCsvTextToRows(csvText)

    if (rows.length === 0) {
      setMessage('No valid rows found in CSV.')
      return
    }

    const res = await fetch(`${API_BASE}/customers/bulk-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    })

    const data = await res.json()

    if (data.success) {
      const summary = data.data || {}
      setMessage(
        `Bulk upload completed. Created: ${summary.created_count || 0}, Skipped: ${summary.skipped_count || 0}`
      )
      setBulkCsvFile(null)
      await loadCustomers()
    } else {
      setMessage(data.message || 'Bulk upload failed.')
    }
  } catch (error) {
    console.error(error)
    setMessage(error.message || 'Bulk upload request failed.')
  } finally {
    setLoadingBulkUpload(false)
  }
}

  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    setLoadingCustomer(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Customer created successfully.')
        setCustomerForm({
          account_no: '',
          full_name: '',
          service_address: '',
          billing_address: '',
          mobile_no: '',
          email: '',
          status: 'ACTIVE',
          date_applied: TODAY,
          notes: '',
          plan_id: '' // ✅ IMPORTANT

        })
        await loadCustomers()
      } else {
        setMessage(data.message || 'Failed to create customer.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Customer request failed.')
    } finally {
      setLoadingCustomer(false)
    }
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    setLoadingPayment(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          customer_id: Number(paymentForm.customer_id),
          amount: Number(paymentForm.amount)
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Payment posted successfully.')
        setPaymentForm({
          customer_id: '',
          payment_date: TODAY,
          amount: '',
          payment_method: 'CASH',
          reference_no: '',
          remarks: ''
        })

        await Promise.all([
          loadInvoices(),
          loadPayments(),
          loadReceipts(),
          loadCollectionsSummary(),
          loadDueTodayCustomers(),
          loadOverdueCustomers(),
          loadArAging(),
          loadSmsPreview(),
          loadSmsLogs(),
          loadJournalEntries(),
          loadGeneralLedger(),
          loadTrialBalance(),
          loadIncomeStatement(),
          loadBalanceSheet()
        ])

        if (selectedCustomerId) {
          await Promise.all([
            loadLedger(selectedCustomerId),
            loadCustomerDevices(selectedCustomerId)
          ])
        }
      } else {
        setMessage(data.message || 'Failed to post payment.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Payment request failed.')
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    setLoadingExpense(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          expense_account_id: Number(expenseForm.expense_account_id),
          payment_account_id: Number(expenseForm.payment_account_id),
          amount: Number(expenseForm.amount)
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Expense recorded successfully.')
        setExpenseForm({
          expense_date: TODAY,
          payee_name: '',
          reference_no: '',
          description: '',
          expense_account_id: '',
          payment_account_id: '',
          amount: '',
          created_by: 'SYSTEM'
        })

        await Promise.all([
          loadExpenses(),
          loadExpenseSummary(),
          loadJournalEntries(),
          loadGeneralLedger(),
          loadTrialBalance(),
          loadIncomeStatement(),
          loadBalanceSheet()
        ])
      } else {
        setMessage(data.message || 'Failed to record expense.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Expense request failed.')
    } finally {
      setLoadingExpense(false)
    }
  }

  const handleDeviceSubmit = async (e) => {
    e.preventDefault()
    setLoadingDevice(true)
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/device-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deviceForm,
          customer_id: Number(deviceForm.customer_id)
        })
      })

      const data = await res.json()

      if (data.success) {
        const submittedCustomerId = deviceForm.customer_id

        setMessage('Device assigned successfully.')
        setDeviceForm({
          customer_id: '',
          device_type: 'ONU',
          brand_model: '',
          serial_no: '',
          mac_address: '',
          assigned_date: TODAY,
          technician_name: '',
          notes: ''
        })

        await loadDeviceAssignments()

        if (selectedCustomerId && Number(selectedCustomerId) === Number(submittedCustomerId)) {
          await loadCustomerDevices(selectedCustomerId)
        }
      } else {
        setMessage(data.message || 'Failed to assign device.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Device assignment request failed.')
    } finally {
      setLoadingDevice(false)
    }
  }

  const handleReturnDevice = async (assignmentId) => {
    try {
      const res = await fetch(`${API_BASE}/device-assignments/${assignmentId}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returned_date: TODAY,
          notes: 'Returned from frontend'
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Device returned successfully.')
        await loadDeviceAssignments()

        if (selectedCustomerId) {
          await loadCustomerDevices(selectedCustomerId)
        }
      } else {
        setMessage(data.message || 'Failed to return device.')
      }
    } catch (error) {
      console.error(error)
      setMessage('Device return request failed.')
    }
  }

  const planChangeSelectedCustomerRecord = customers.find(
    (customer) => String(customer.id) === String(selectedCustomerId)
  )
  const planChangeCurrentService = ledger?.current_service || null
  const planChangeLabel = planChangeCurrentService
    ? getPlanLabel(planChangeCurrentService)
    : planChangeSelectedCustomerRecord
      ? getPlanLabel(planChangeSelectedCustomerRecord)
      : '-'
  const planChangeMonthlyFee = Number(planChangeCurrentService?.monthly_fee || 0)

  const renderDashboard = () => (
    <>
      <div className="kpi-grid">
        <KpiCard label="Subscribers" value={customers.length} tone="blue" subtext={`${activeCustomersCount} active`} />
        <KpiCard label="Due Today" value={collectionsSummary.customers_due_today} tone="orange" subtext={formatCurrency(collectionsSummary.amount_due_today)} />
        <KpiCard label="Overdue" value={collectionsSummary.customers_overdue} tone="red" subtext={formatCurrency(collectionsSummary.amount_overdue)} />
        <KpiCard label="Total AR" value={formatCurrency(arAging.summary.total_balance)} tone="cyan" subtext="Open receivables" />
        <KpiCard label="Month Collections" value={formatCurrency(monthCollections)} tone="green" subtext={currentMonthKey} />
        <KpiCard label="Month Expenses" value={formatCurrency(monthExpenses)} tone="default" subtext={`${assignedDevicesCount} devices assigned`} />
      </div>

      <div className="layout-two">
        <ViewCard title="Collection Watchlist" subtitle="Immediate actions">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {dueTodayCustomers.slice(0, 4).map((row) => (
                  <tr key={`due-${row.customer_id}`}>
                    <td>{row.account_no} - {row.full_name}</td>
                    <td>Due Today</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatCurrency(row.total_balance)}</td>
                  </tr>
                ))}
                {overdueCustomers.slice(0, 4).map((row) => (
                  <tr key={`over-${row.customer_id}`}>
                    <td>{row.account_no} - {row.full_name}</td>
                    <td>Overdue</td>
                    <td>{row.max_overdue_days} days</td>
                    <td>{formatCurrency(row.total_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dueTodayCustomers.length === 0 && overdueCustomers.length === 0 && <EmptyState text="No customers needing collection attention." />}
        </ViewCard>

        <ViewCard title="Recent Payments" subtitle="Latest cashier activity">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 8).map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.account_no} - {payment.full_name}</td>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>{payment.payment_method}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && <EmptyState text="No payments yet." />}
        </ViewCard>
      </div>
    </>
  )

  const renderCustomers = () => (
    <>
      <ViewCard title="Add Customer" subtitle="New subscriber onboarding">
        <form onSubmit={handleCustomerSubmit} className="form-grid">
          <input name="account_no" placeholder="Account No" value={customerForm.account_no} onChange={handleCustomerChange} required />
          <input name="full_name" placeholder="Full Name" value={customerForm.full_name} onChange={handleCustomerChange} required />
          <select
    name="plan_id"
    value={customerForm.plan_id}
    onChange={handleCustomerChange}
    required
  >
    <option value="">Select Plan</option>
    {plans.map(plan => (
      <option key={plan.id} value={plan.id}>
        {plan.plan_name} - ₱{plan.monthly_fee}
      </option>
    ))}
  </select>

  {/* ✅ OPTIONAL: SHOW PLAN PRICE */}
  {customerForm.plan_id && (
    <div className="plan-preview span-2">
      Monthly Fee: ₱{
        plans.find(p => String(p.id) === String(customerForm.plan_id))?.monthly_fee || 0
      }
    </div>
  )}
          <input name="service_address" placeholder="Service Address" value={customerForm.service_address} onChange={handleCustomerChange} required />
          <input name="billing_address" placeholder="Billing Address" value={customerForm.billing_address} onChange={handleCustomerChange} />
          <input name="mobile_no" placeholder="Mobile Number" value={customerForm.mobile_no} onChange={handleCustomerChange} />
          <input name="email" placeholder="Email" value={customerForm.email} onChange={handleCustomerChange} />
          <select name="status" value={customerForm.status} onChange={handleCustomerChange}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="APPLICANT">APPLICANT</option>
            <option value="FOR_SURVEY">FOR_SURVEY</option>
            <option value="FOR_INSTALLATION">FOR_INSTALLATION</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DISCONNECTED">DISCONNECTED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
          <input name="date_applied" type="date" value={customerForm.date_applied} onChange={handleCustomerChange} />
          <textarea className="span-2" name="notes" placeholder="Notes" value={customerForm.notes} onChange={handleCustomerChange} rows="4" />
          <div className="span-2 form-actions">
            <button className="primary-btn" type="submit" disabled={loadingCustomer}>
              {loadingCustomer ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>

      <div className="section-gap" />

<div className="span-2" style={{ display: 'grid', gap: '12px' }}>
  <div>
    <h3 style={{ marginBottom: '6px' }}>Bulk Upload CSV</h3>
    <p style={{ margin: 0, opacity: 0.8 }}>
      Upload your customer CSV file. Required columns: account_no, full_name, service_address, and either plan_id or plan_key.
    </p>
  </div>

  <input
    type="file"
    accept=".csv,text/csv"
    onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
  />

  <div className="form-actions">
    <button
      type="button"
      className="secondary-btn"
      onClick={handleBulkCsvUpload}
      disabled={loadingBulkUpload || !bulkCsvFile}
    >
      {loadingBulkUpload ? 'Uploading CSV...' : 'Upload CSV'}
    </button>

    {bulkCsvFile && (
      <span style={{ fontSize: '14px', opacity: 0.8 }}>
        {bulkCsvFile.name}
      </span>
    )}
  </div>
</div>

      <div className="section-gap" />

<div className="span-2" style={{ display: 'grid', gap: '12px' }}>
  <div>
    <h3 style={{ marginBottom: '6px' }}>Bulk Plan Update CSV</h3>
    <p style={{ margin: 0, opacity: 0.8 }}>
      Update old customers in bulk. Required columns: account_no and new_plan_code (or plan_key / new_plan_id). Optional: effective_date, changed_by, remarks.
    </p>
  </div>

  <input
    type="file"
    accept=".csv,text/csv"
    onChange={(e) => setBulkPlanCsvFile(e.target.files?.[0] || null)}
  />

  <div className="form-actions">
    <button
      type="button"
      className="secondary-btn"
      onClick={handleBulkPlanCsvUpload}
      disabled={loadingBulkPlanUpdate || !bulkPlanCsvFile}
    >
      {loadingBulkPlanUpdate ? 'Updating Plans...' : 'Bulk Update Plans'}
    </button>

    {bulkPlanCsvFile && (
      <span style={{ fontSize: '14px', opacity: 0.8 }}>
        {bulkPlanCsvFile.name}
      </span>
    )}
  </div>
</div>
      </ViewCard>

      <ViewCard
        title="Customer Directory"
        subtitle="Search and open full customer profile"
        action={
          <div className="toolbar">
            <input
              className="toolbar-search"
              placeholder="Search customer"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <select value={customerStatusFilter} onChange={(e) => setCustomerStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DISCONNECTED">DISCONNECTED</option>
              <option value="TERMINATED">TERMINATED</option>
            </select>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account No</th>
                <th>Full Name</th>
                <th>Mobile</th>
                <th>Plan</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.account_no}</td>
                  <td>{customer.full_name}</td>
                  <td>{customer.mobile_no || '-'}</td>
                  <td>{customer.plan_name || customer.speed_profile || customer.plan_code || '-'}</td>
                  <td>
                    <StatusBadge tone={customer.status === 'ACTIVE' ? 'green' : customer.status === 'SUSPENDED' ? 'orange' : 'default'}>
                      {customer.status}
                    </StatusBadge>
                  </td>
                  <td>
                    <button className="table-link-btn" type="button" onClick={() => openCustomerLedger(customer.id)}>
                      Open 360
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && <EmptyState text="No customers found." />}
      </ViewCard>
    </>
  )

  const renderLedger = () => {
    const selectedCustomerRecord = customers.find((customer) => String(customer.id) === String(selectedCustomerId))
    const currentService = ledger?.current_service || null
    const customerPlanLabel = currentService
      ? getPlanLabel(currentService)
      : selectedCustomerRecord
        ? getPlanLabel(selectedCustomerRecord)
        : '-'
    const currentMonthlyFee = Number(currentService?.monthly_fee || 0)

    return (
    <ViewCard title="Customer 360" subtitle="Billing, payments, devices, and balances">
      <div id="customer-ledger-section" className="toolbar toolbar-wrap">
        <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="wide-select">
          <option value="">Select Customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.account_no} - {customer.full_name}
            </option>
          ))}
        </select>

        <div className="tab-row">
          <button className={`tab-btn ${customer360Tab === 'overview' ? 'active' : ''}`} onClick={() => setCustomer360Tab('overview')}>Overview</button>
          <button className={`tab-btn ${customer360Tab === 'billing' ? 'active' : ''}`} onClick={() => setCustomer360Tab('billing')}>Billing</button>
          <button className={`tab-btn ${customer360Tab === 'payments' ? 'active' : ''}`} onClick={() => setCustomer360Tab('payments')}>Payments</button>
          <button className={`tab-btn ${customer360Tab === 'devices' ? 'active' : ''}`} onClick={() => setCustomer360Tab('devices')}>Devices</button>
        </div>
      </div>

      {!ledger ? (
        <EmptyState text="Select a customer to open the 360 profile." />
      ) : (
        <div className="stack-gap">
          <div className="hero-card">
            <div>
              <div className="eyebrow">Customer Profile</div>
              <h3>{ledger.customer.full_name}</h3>
              <p>{ledger.customer.account_no} • {customerPlanLabel} • {ledger.customer.mobile_no || '-'} • {ledger.customer.email || '-'}</p>
            </div>
            <div className="form-actions">
              <StatusBadge tone={ledger.customer.status === 'ACTIVE' ? 'green' : 'default'}>
                {ledger.customer.status}
              </StatusBadge>
              <button className="secondary-btn" type="button" onClick={openPlanChangeModal}>
                Change Plan
              </button>
              <button className="secondary-btn" type="button" onClick={openEditCustomerModal}>
                Edit Customer
              </button>
            </div>
          </div>

          {customer360Tab === 'overview' && (
            <>
              <div className="kpi-grid small">
                <KpiCard label="Total Invoices" value={formatCurrency(ledger.summary.total_invoices)} tone="blue" />
                <KpiCard label="Total Payments" value={formatCurrency(ledger.summary.total_payments)} tone="green" />
                <KpiCard label="Allocated" value={formatCurrency(ledger.summary.total_allocated)} tone="cyan" />
                <KpiCard label="Balance" value={formatCurrency(ledger.summary.total_balance)} tone="red" />
                <KpiCard label="Unapplied" value={formatCurrency(ledger.summary.unapplied_amount)} tone="orange" />
              </div>

              <ViewCard
                title="Current Service"
                subtitle="Use Change Plan to upgrade or downgrade this subscriber"
                action={
                  <button className="secondary-btn" type="button" onClick={openPlanChangeModal}>
                    Change Plan
                  </button>
                }
              >
                {!currentService ? (
                  <EmptyState text="No active service found for this customer." />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Monthly Fee</th>
                          <th>Billing Start</th>
                          <th>Due Day</th>
                          <th>Connection</th>
                          <th>IP Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{customerPlanLabel}</td>
                          <td>{formatCurrency(currentMonthlyFee)}</td>
                          <td>{formatDate(currentService.billing_start_date)}</td>
                          <td>{currentService.due_day || '-'}</td>
                          <td>{currentService.connection_type || '-'}</td>
                          <td>{currentService.ip_mode || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </ViewCard>

              <div className="layout-two">
                <ViewCard title="Recent Invoices">
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Bill Date</th>
                          <th>Due Date</th>
                          <th>Total</th>
                          <th>Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.invoices.slice(0, 8).map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{invoice.invoice_no}</td>
                            <td>{formatDate(invoice.bill_date)}</td>
                            <td>{formatDate(invoice.due_date)}</td>
                            <td>{formatCurrency(invoice.total_amount)}</td>
                            <td>{formatCurrency(invoice.balance_amount)}</td>
                            <td>{invoice.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {ledger.invoices.length === 0 && <EmptyState text="No invoices yet." />}
                </ViewCard>

                <ViewCard title="Recent Payments">
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Payment No</th>
                          <th>Date</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.payments.slice(0, 8).map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.payment_no}</td>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td>{payment.payment_method}</td>
                            <td>{formatCurrency(payment.amount)}</td>
                            <td>{payment.receipt_no || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {ledger.payments.length === 0 && <EmptyState text="No payments yet." />}
                </ViewCard>
              </div>
            </>
          )}

          {customer360Tab === 'billing' && (
            <ViewCard title="Billing History">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Bill Date</th>
                      <th>Due Date</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_no}</td>
                        <td>{formatDate(invoice.bill_date)}</td>
                        <td>{formatDate(invoice.due_date)}</td>
                        <td>{formatCurrency(invoice.total_amount)}</td>
                        <td>{formatCurrency(invoice.amount_paid)}</td>
                        <td>{formatCurrency(invoice.balance_amount)}</td>
                        <td>{invoice.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledger.invoices.length === 0 && <EmptyState text="No billing records." />}
            </ViewCard>
          )}

          {customer360Tab === 'payments' && (
            <ViewCard title="Payment History">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment No</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.payment_no}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{payment.payment_method}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.receipt_no || '-'}</td>
                        <td>{payment.reference_no || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-gap" />

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment No</th>
                      <th>Invoice No</th>
                      <th>Allocated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.allocations.map((row, index) => (
                      <tr key={index}>
                        <td>{row.payment_no}</td>
                        <td>{row.invoice_no}</td>
                        <td>{formatCurrency(row.amount_applied)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledger.payments.length === 0 && ledger.allocations.length === 0 && <EmptyState text="No payment history." />}
            </ViewCard>
          )}

          {customer360Tab === 'devices' && (
            <ViewCard title="Assigned Devices">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Assignment No</th>
                      <th>Type</th>
                      <th>Brand / Model</th>
                      <th>Serial</th>
                      <th>Assigned Date</th>
                      <th>Returned Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDevices.map((device) => (
                      <tr key={device.id}>
                        <td>{device.assignment_no}</td>
                        <td>{device.device_type}</td>
                        <td>{device.brand_model || '-'}</td>
                        <td>{device.serial_no}</td>
                        <td>{formatDate(device.assigned_date)}</td>
                        <td>{formatDate(device.returned_date)}</td>
                        <td>{device.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {customerDevices.length === 0 && <EmptyState text="No devices assigned." />}
            </ViewCard>
          )}
        </div>
      )}
    </ViewCard>
    )
  }

  const renderCollections = () => (
    <>
      <ViewCard title="Collections Center" subtitle="Due today, overdue, and aging buckets">
        <div className="kpi-grid small">
          <KpiCard label="Due Today" value={collectionsSummary.customers_due_today} tone="orange" subtext={formatCurrency(collectionsSummary.amount_due_today)} />
          <KpiCard label="Overdue" value={collectionsSummary.customers_overdue} tone="red" subtext={formatCurrency(collectionsSummary.amount_overdue)} />
          <KpiCard label="Current AR" value={formatCurrency(arAging.summary.current_amount)} tone="blue" />
          <KpiCard label="1–30 Days" value={formatCurrency(arAging.summary.bucket_1_30)} tone="orange" />
          <KpiCard label="31–60 Days" value={formatCurrency(arAging.summary.bucket_31_60)} tone="red" />
          <KpiCard label="90+ Days" value={formatCurrency(arAging.summary.bucket_90_plus)} tone="red" />
        </div>
      </ViewCard>

      <div className="layout-two">
        <ViewCard title="Due Today">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account No</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Invoice Count</th>
                  <th>Due Date</th>
                  <th>Total Balance</th>
                </tr>
              </thead>
              <tbody>
                {dueTodayCustomers.map((row) => (
                  <tr key={row.customer_id}>
                    <td>{row.account_no}</td>
                    <td>{row.full_name}</td>
                    <td>{row.mobile_no || '-'}</td>
                    <td>{row.invoice_count}</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatCurrency(row.total_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dueTodayCustomers.length === 0 && <EmptyState text="No customers due today." />}
        </ViewCard>

        <ViewCard title="Overdue">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account No</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Oldest Due</th>
                  <th>Days Overdue</th>
                  <th>Total Balance</th>
                </tr>
              </thead>
              <tbody>
                {overdueCustomers.map((row) => (
                  <tr key={row.customer_id}>
                    <td>{row.account_no}</td>
                    <td>{row.full_name}</td>
                    <td>{row.mobile_no || '-'}</td>
                    <td>{formatDate(row.oldest_due_date)}</td>
                    <td>{row.max_overdue_days}</td>
                    <td>{formatCurrency(row.total_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overdueCustomers.length === 0 && <EmptyState text="No overdue customers." />}
        </ViewCard>
      </div>

      <ViewCard title="AR Aging">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account No</th>
                <th>Customer</th>
                <th>Current</th>
                <th>1–30</th>
                <th>31–60</th>
                <th>61–90</th>
                <th>90+</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {arAging.customers.map((row) => (
                <tr key={row.customer_id}>
                  <td>{row.account_no}</td>
                  <td>{row.full_name}</td>
                  <td>{formatCurrency(row.current_amount)}</td>
                  <td>{formatCurrency(row.bucket_1_30)}</td>
                  <td>{formatCurrency(row.bucket_31_60)}</td>
                  <td>{formatCurrency(row.bucket_61_90)}</td>
                  <td>{formatCurrency(row.bucket_90_plus)}</td>
                  <td>{formatCurrency(row.total_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {arAging.customers.length === 0 && <EmptyState text="No outstanding receivables." />}
      </ViewCard>
    </>
  )

  const renderPayments = () => (
    <>
      <ViewCard title="Post Payment" subtitle="Cashier input and receipt generation">
        <form onSubmit={handlePaymentSubmit} className="form-grid">
          <select name="customer_id" value={paymentForm.customer_id} onChange={handlePaymentChange} required>
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.account_no} - {customer.full_name}
              </option>
            ))}
          </select>
          <input name="payment_date" type="date" value={paymentForm.payment_date} onChange={handlePaymentChange} required />
          <input name="amount" type="number" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={handlePaymentChange} required />
          <select name="payment_method" value={paymentForm.payment_method} onChange={handlePaymentChange}>
            <option value="CASH">CASH</option>
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="GCASH">GCASH</option>
            <option value="MAYA">MAYA</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input name="reference_no" placeholder="Reference No" value={paymentForm.reference_no} onChange={handlePaymentChange} />
          <textarea className="span-2" name="remarks" placeholder="Remarks" value={paymentForm.remarks} onChange={handlePaymentChange} rows="4" />
          <div className="span-2 form-actions">
            <button className="primary-btn" type="submit" disabled={loadingPayment}>
              {loadingPayment ? 'Posting...' : 'Post Payment'}
            </button>
          </div>
        </form>
      </ViewCard>

      <ViewCard
        title="Invoices"
        subtitle="Search and monitor invoice balances"
        action={
          <div className="toolbar">
            <input className="toolbar-search" placeholder="Search invoice" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
            <select value={invoiceStatusFilter} onChange={(e) => setInvoiceStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="POSTED">POSTED</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Cycle</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_no}</td>
                  <td>{invoice.full_name}</td>
                  <td>{invoice.cycle_code}</td>
                  <td>{formatCurrency(invoice.total_amount)}</td>
                  <td>{formatCurrency(invoice.amount_paid)}</td>
                  <td>{formatCurrency(invoice.balance_amount)}</td>
                  <td>{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && <EmptyState text="No invoices found." />}
      </ViewCard>

      <ViewCard
        title="Payments & Receipts"
        subtitle="Cash receipt activity"
        action={
          <input className="toolbar-search" placeholder="Search payment" value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} />
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment No</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.payment_no}</td>
                  <td>{payment.account_no} - {payment.full_name}</td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>{payment.payment_method}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{payment.reference_no || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-gap" />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>{receipt.receipt_no}</td>
                  <td>{receipt.account_no} - {receipt.full_name}</td>
                  <td>{formatDate(receipt.receipt_date)}</td>
                  <td>{formatCurrency(receipt.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ViewCard>
    </>
  )

  const renderDevices = () => (
    <>
      <ViewCard title="Assign Device" subtitle="Field installation and hardware tracking">
        <form onSubmit={handleDeviceSubmit} className="form-grid">
          <select name="customer_id" value={deviceForm.customer_id} onChange={handleDeviceChange} required>
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.account_no} - {customer.full_name}
              </option>
            ))}
          </select>
          <select name="device_type" value={deviceForm.device_type} onChange={handleDeviceChange} required>
            <option value="ONU">ONU</option>
            <option value="ROUTER">ROUTER</option>
            <option value="MODEM">MODEM</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input name="brand_model" placeholder="Brand / Model" value={deviceForm.brand_model} onChange={handleDeviceChange} />
          <input name="serial_no" placeholder="Serial Number" value={deviceForm.serial_no} onChange={handleDeviceChange} required />
          <input name="mac_address" placeholder="MAC Address" value={deviceForm.mac_address} onChange={handleDeviceChange} />
          <input name="assigned_date" type="date" value={deviceForm.assigned_date} onChange={handleDeviceChange} required />
          <input name="technician_name" placeholder="Technician Name" value={deviceForm.technician_name} onChange={handleDeviceChange} />
          <textarea className="span-2" name="notes" placeholder="Notes" value={deviceForm.notes} onChange={handleDeviceChange} rows="4" />
          <div className="span-2 form-actions">
            <button className="primary-btn" type="submit" disabled={loadingDevice}>
              {loadingDevice ? 'Saving...' : 'Assign Device'}
            </button>
          </div>
        </form>
      </ViewCard>

      <ViewCard
        title="Device Registry"
        subtitle="Search, filter, and return equipment"
        action={
          <div className="toolbar">
            <input className="toolbar-search" placeholder="Search device" value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} />
            <select value={deviceStatusFilter} onChange={(e) => setDeviceStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="RETURNED">RETURNED</option>
            </select>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assignment No</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Brand / Model</th>
                <th>Serial</th>
                <th>Assigned</th>
                <th>Returned</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td>{device.assignment_no}</td>
                  <td>{device.account_no} - {device.full_name}</td>
                  <td>{device.device_type}</td>
                  <td>{device.brand_model || '-'}</td>
                  <td>{device.serial_no}</td>
                  <td>{formatDate(device.assigned_date)}</td>
                  <td>{formatDate(device.returned_date)}</td>
                  <td>{device.status}</td>
                  <td>
                    {device.status === 'ASSIGNED' && (
                      <button className="table-link-btn" onClick={() => handleReturnDevice(device.id)}>
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDevices.length === 0 && <EmptyState text="No devices found." />}
      </ViewCard>
    </>
  )

  const renderExpenses = () => (
    <>
      <ViewCard title="Record Expense" subtitle="Paid expenses with journal posting">
        <form onSubmit={handleExpenseSubmit} className="form-grid">
          <input name="expense_date" type="date" value={expenseForm.expense_date} onChange={handleExpenseChange} required />
          <input name="payee_name" placeholder="Payee Name" value={expenseForm.payee_name} onChange={handleExpenseChange} required />
          <input name="reference_no" placeholder="Reference No" value={expenseForm.reference_no} onChange={handleExpenseChange} />
          <textarea name="description" placeholder="Description" value={expenseForm.description} onChange={handleExpenseChange} rows="3" required />
          <select name="expense_account_id" value={expenseForm.expense_account_id} onChange={handleExpenseChange} required>
            <option value="">Select Expense Account</option>
            {expenseAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_code} - {account.account_name}
              </option>
            ))}
          </select>
          <select name="payment_account_id" value={expenseForm.payment_account_id} onChange={handleExpenseChange} required>
            <option value="">Select Payment Source Account</option>
            {paymentAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_code} - {account.account_name}
              </option>
            ))}
          </select>
          <input name="amount" type="number" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={handleExpenseChange} required />
          <div className="form-actions span-2">
            <button className="primary-btn" type="submit" disabled={loadingExpense}>
              {loadingExpense ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </ViewCard>

      <div className="layout-two">
        <ViewCard title="Expense Summary">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Entries</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {expenseSummary.map((row) => (
                  <tr key={row.expense_account_id}>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{row.expense_count}</td>
                    <td>{formatCurrency(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expenseSummary.length === 0 && <EmptyState text="No expenses yet." />}
        </ViewCard>

        <ViewCard
          title="Expense Entries"
          action={<input className="toolbar-search" placeholder="Search expense" value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} />}
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense No</th>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expense_no}</td>
                    <td>{formatDate(expense.expense_date)}</td>
                    <td>{expense.payee_name}</td>
                    <td>{expense.description}</td>
                    <td>{expense.expense_account_code} - {expense.expense_account_name}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredExpenses.length === 0 && <EmptyState text="No expense entries found." />}
        </ViewCard>
      </div>
    </>
  )

  const renderSms = () => (
    <ViewCard
      title="SMS Operations"
      subtitle="Preview, run, and monitor collections messaging"
      action={
        <button className="primary-btn" onClick={handleRunSmsNow} disabled={loadingSmsRun}>
          {loadingSmsRun ? 'Running...' : 'Run SMS Now'}
        </button>
      }
    >
      <div className="kpi-grid small">
        <KpiCard label="3 Days Before Due" value={smsPreview.due_soon_3d.length} tone="cyan" />
        <KpiCard label="Due Today" value={smsPreview.due_today.length} tone="orange" />
        <KpiCard label="Final Notice" value={smsPreview.final_notice.length} tone="red" />
      </div>

      <div className="layout-two">
        <ViewCard title="Preview Queue">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {smsPreview.due_soon_3d.map((row) => (
                  <tr key={`soon-${row.invoice_id}`}>
                    <td>{row.account_no} - {row.full_name}</td>
                    <td>3 Days Before Due</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatCurrency(row.balance_amount)}</td>
                  </tr>
                ))}
                {smsPreview.due_today.map((row) => (
                  <tr key={`today-${row.invoice_id}`}>
                    <td>{row.account_no} - {row.full_name}</td>
                    <td>Due Today</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatCurrency(row.balance_amount)}</td>
                  </tr>
                ))}
                {smsPreview.final_notice.map((row) => (
                  <tr key={`final-${row.invoice_id}`}>
                    <td>{row.account_no} - {row.full_name}</td>
                    <td>Final Notice</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatCurrency(row.balance_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {smsPreview.due_soon_3d.length === 0 &&
            smsPreview.due_today.length === 0 &&
            smsPreview.final_notice.length === 0 && <EmptyState text="No SMS scheduled right now." />}
        </ViewCard>

        <ViewCard
          title="SMS Logs"
          action={
            <div className="toolbar">
              <input className="toolbar-search" placeholder="Search SMS log" value={smsLogSearch} onChange={(e) => setSmsLogSearch(e.target.value)} />
              <select value={smsStatusFilter} onChange={(e) => setSmsStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
                <option value="QUEUED">QUEUED</option>
                <option value="SKIPPED_NO_CONTACT">SKIPPED_NO_CONTACT</option>
              </select>
            </div>
          }
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SMS No</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sent / Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredSmsLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.sms_no}</td>
                    <td>{log.account_no || '-'} - {log.full_name || '-'}</td>
                    <td>{log.sms_type}</td>
                    <td>{log.provider_status}</td>
                    <td>{formatDateTime(log.sent_at || log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSmsLogs.length === 0 && <EmptyState text="No SMS logs found." />}
        </ViewCard>
      </div>
    </ViewCard>
  )

  const renderAccounting = () => (
    <>
      <ViewCard title="Accounting Summary" subtitle="Finance snapshot">
        <div className="kpi-grid small">
          <KpiCard label="Total Income" value={formatCurrency(incomeStatement.total_income)} tone="green" />
          <KpiCard label="Total Expenses" value={formatCurrency(incomeStatement.total_expenses)} tone="default" />
          <KpiCard label="Net Income" value={formatCurrency(incomeStatement.net_income)} tone="blue" />
          <KpiCard label="Assets" value={formatCurrency(balanceSheet.total_assets)} tone="cyan" />
          <KpiCard label="Liabilities" value={formatCurrency(balanceSheet.total_liabilities)} tone="orange" />
          <KpiCard label="Equity" value={formatCurrency(balanceSheet.total_equity_with_income)} tone="blue" />
        </div>
      </ViewCard>

      <div className="layout-two">
        <ViewCard title="Trial Balance">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.id}>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.total_debit)}</td>
                    <td>{formatCurrency(row.total_credit)}</td>
                    <td>{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ViewCard>

        <ViewCard title="Income Statement">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {incomeStatement.income_accounts.map((row) => (
                  <tr key={`inc-${row.id}`}>
                    <td>Income</td>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {incomeStatement.expense_accounts.map((row) => (
                  <tr key={`exp-${row.id}`}>
                    <td>Expense</td>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ViewCard>
      </div>

      <div className="layout-two">
        <ViewCard title="Balance Sheet Details">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {balanceSheet.assets.map((row) => (
                  <tr key={`asset-${row.id}`}>
                    <td>Asset</td>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {balanceSheet.liabilities.map((row) => (
                  <tr key={`liab-${row.id}`}>
                    <td>Liability</td>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {balanceSheet.equity.map((row) => (
                  <tr key={`eq-${row.id}`}>
                    <td>Equity</td>
                    <td>{row.account_code} - {row.account_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ViewCard>

        <ViewCard title="Journal Entries">
          <div className="list">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="item">
                <strong>{entry.entry_no}</strong>
                <div>{formatDate(entry.entry_date)} • {entry.source_type}</div>
                <div>{entry.memo || '-'}</div>
                <div className="stack-lines">
                  {entry.lines.map((line) => (
                    <div key={line.id}>
                      {line.account_code} - {line.account_name} | Debit: {formatCurrency(line.debit)} | Credit: {formatCurrency(line.credit)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ViewCard>
      </div>

      <ViewCard title="General Ledger">
        <div className="list">
          {generalLedger.map((row) => (
            <div key={row.id} className="item">
              <strong>{row.account_code} - {row.account_name}</strong>
              <div>{row.entry_no} • {formatDate(row.entry_date)}</div>
              <div>{row.memo || '-'}</div>
              <div>{row.description || '-'}</div>
              <div>Debit: {formatCurrency(row.debit)} • Credit: {formatCurrency(row.credit)}</div>
              <StatusBadge tone="default">Running: {formatCurrency(row.running_balance)}</StatusBadge>
            </div>
          ))}
        </div>
      </ViewCard>
    </>
  )

  const renderActiveView = () => {
    switch (activeView) {
      case 'customers':
        return renderCustomers()
      case 'ledger':
        return renderLedger()
      case 'collections':
        return renderCollections()
      case 'payments':
        return renderPayments()
      case 'devices':
        return renderDevices()
      case 'expenses':
        return renderExpenses()
      case 'sms':
        return renderSms()
      case 'accounting':
        return renderAccounting()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="telecom-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SMARTLINKX</div>
            <div className="brand-subtitle">Telecom Console</div>
          </div>
        </div>

        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${activeView === item.key ? 'active' : ''}`}
              onClick={() => setActiveView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-label">Today</div>
          <div className="sidebar-card-value">{formatDate(TODAY)}</div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-label">Open Receivables</div>
          <div className="sidebar-card-value">{formatCurrency(arAging.summary.total_balance)}</div>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">White Telecom UI • Phase 2</div>
            <h1>{VIEW_TITLES[activeView]}</h1>
          </div>

          <div className="topbar-actions">
            <div className="today-chip">{formatDate(TODAY)}</div>
            <button className="secondary-btn" onClick={loadAll}>
              Refresh Data
            </button>
          </div>
        </header>

        {message && <div className="floating-message">{message}</div>}

        <div className="page-content">{renderActiveView()}</div>
      </main>

      {showPlanChangeModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-head">
              <div>
                <h2>Change Plan</h2>
                <p>Upgrade or downgrade the active customer service</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowPlanChangeModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePlanChangeSubmit} className="form-grid">
              <div className="span-2">
                <strong>Current Plan:</strong> {planChangeLabel} ({formatCurrency(planChangeMonthlyFee)})
              </div>

              <select
                name="new_plan_id"
                value={planChangeForm.new_plan_id}
                onChange={handlePlanChangeFormChange}
                required
              >
                <option value="">Select New Plan</option>
                {plans
                  .filter((plan) => String(plan.id) !== String(ledger?.current_service?.plan_id))
                  .map((plan) => {
                    const targetFee = Number(plan.monthly_fee || 0)
                    let changeLabel = 'Change'
                    if (targetFee > planChangeMonthlyFee) changeLabel = 'Upgrade'
                    if (targetFee < planChangeMonthlyFee) changeLabel = 'Downgrade'

                    return (
                      <option key={plan.id} value={plan.id}>
                        {getPlanLabel(plan)} - {formatCurrency(plan.monthly_fee)} ({changeLabel})
                      </option>
                    )
                  })}
              </select>

              <input
                name="effective_date"
                type="date"
                value={planChangeForm.effective_date}
                onChange={handlePlanChangeFormChange}
                required
              />

              <textarea
                className="span-2"
                name="remarks"
                placeholder="Remarks (optional)"
                value={planChangeForm.remarks}
                onChange={handlePlanChangeFormChange}
                rows="4"
              />

              <div className="span-2 form-actions">
                <button className="primary-btn" type="submit" disabled={loadingPlanChange}>
                  {loadingPlanChange ? 'Saving...' : 'Save Plan Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditCustomerModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-head">
              <div>
                <h2>Edit Customer</h2>
                <p>Update subscriber details</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowEditCustomerModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="form-grid">
              <input
                name="account_no"
                placeholder="Account No"
                value={editCustomerForm.account_no}
                onChange={handleEditCustomerChange}
                required
              />
              <input
                name="full_name"
                placeholder="Full Name"
                value={editCustomerForm.full_name}
                onChange={handleEditCustomerChange}
                required
              />
              <input
                name="company_name"
                placeholder="Company Name"
                value={editCustomerForm.company_name}
                onChange={handleEditCustomerChange}
              />
              <input
                name="mobile_no"
                placeholder="Mobile Number"
                value={editCustomerForm.mobile_no}
                onChange={handleEditCustomerChange}
              />
              <input
                className="span-2"
                name="service_address"
                placeholder="Service Address"
                value={editCustomerForm.service_address}
                onChange={handleEditCustomerChange}
                required
              />
              <input
                className="span-2"
                name="billing_address"
                placeholder="Billing Address"
                value={editCustomerForm.billing_address}
                onChange={handleEditCustomerChange}
              />
              <input
                name="email"
                placeholder="Email"
                value={editCustomerForm.email}
                onChange={handleEditCustomerChange}
              />
              <select
                name="status"
                value={editCustomerForm.status}
                onChange={handleEditCustomerChange}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="APPLICANT">APPLICANT</option>
                <option value="FOR_SURVEY">FOR_SURVEY</option>
                <option value="FOR_INSTALLATION">FOR_INSTALLATION</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DISCONNECTED">DISCONNECTED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
              <input
                name="date_applied"
                type="date"
                value={editCustomerForm.date_applied}
                onChange={handleEditCustomerChange}
              />
              <textarea
                className="span-2"
                name="notes"
                placeholder="Notes"
                value={editCustomerForm.notes}
                onChange={handleEditCustomerChange}
                rows="4"
              />
              <div className="span-2 form-actions">
                <button className="primary-btn" type="submit" disabled={loadingEditCustomer}>
                  {loadingEditCustomer ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
