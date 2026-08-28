import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './state/AuthContext'
import { AppShell } from './layouts/AppShell'
import { PinSetupScreen } from './screens/auth/PinSetupScreen'
import { PinLoginScreen } from './screens/auth/PinLoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { AccountsScreen } from './screens/AccountsScreen'
import { AddAccountScreen } from './screens/AddAccountScreen'
import { MoreScreen } from './screens/MoreScreen'
import { AddChooserScreen } from './screens/AddChooserScreen'
import { AddTransactionScreen } from './screens/AddTransactionScreen'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { AddCategoryScreen } from './screens/AddCategoryScreen'
import { IncomeSourcesScreen } from './screens/IncomeSourcesScreen'
import { AddIncomeSourceScreen } from './screens/AddIncomeSourceScreen'
import { SubscriptionsScreen } from './screens/SubscriptionsScreen'
import { AddSubscriptionScreen } from './screens/AddSubscriptionScreen'
import { CommitmentsScreen } from './screens/CommitmentsScreen'
import { AddCommitmentScreen } from './screens/AddCommitmentScreen'
import { GoalsScreen } from './screens/GoalsScreen'
import { RecurringScreen } from './screens/RecurringScreen'
import { AddRecurringScreen } from './screens/AddRecurringScreen'
import { ConfirmRecurringScreen } from './screens/ConfirmRecurringScreen'
import { PeopleListScreen } from './screens/loans/PeopleListScreen'
import { AddPersonScreen } from './screens/loans/AddPersonScreen'
import { PersonDetailScreen } from './screens/loans/PersonDetailScreen'
import { AddLoanScreen } from './screens/loans/AddLoanScreen'
import { SyncSettingsScreen } from './screens/SyncSettingsScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { ComparisonsScreen } from './screens/ComparisonsScreen'
import { ExportReportScreen } from './screens/ExportReportScreen'
import { AboutScreen } from './screens/AboutScreen'
import { AllTransactionsScreen } from './screens/AllTransactionsScreen'
import { SecurityScreen } from './screens/SecurityScreen'
import { ChangePinScreen } from './screens/ChangePinScreen'
import { CalculatorScreen } from './screens/CalculatorScreen'

function RequireUnlocked() {
  const { hasPin, unlocked } = useAuth()
  if (!hasPin) return <Navigate to="/setup" replace />
  if (!unlocked) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<PinSetupScreen />} />
      <Route path="/login" element={<PinLoginScreen />} />

      <Route element={<RequireUnlocked />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="accounts" element={<AccountsScreen />} />
          <Route path="loans" element={<PeopleListScreen />} />
          <Route path="more" element={<MoreScreen />} />
        </Route>
        <Route path="add" element={<AddChooserScreen />} />
        <Route path="accounts/new" element={<AddAccountScreen />} />
        <Route path="accounts/:id/edit" element={<AddAccountScreen />} />
        <Route path="add/transaction" element={<AddTransactionScreen />} />
        <Route path="add/transaction/:id" element={<AddTransactionScreen />} />
        <Route path="transactions" element={<AllTransactionsScreen />} />
        <Route path="categories" element={<CategoriesScreen />} />
        <Route path="categories/new" element={<AddCategoryScreen />} />
        <Route path="categories/:id/edit" element={<AddCategoryScreen />} />
        <Route path="income-sources" element={<IncomeSourcesScreen />} />
        <Route path="income-sources/new" element={<AddIncomeSourceScreen />} />
        <Route path="income-sources/:id/edit" element={<AddIncomeSourceScreen />} />
        <Route path="subscriptions" element={<SubscriptionsScreen />} />
        <Route path="subscriptions/new" element={<AddSubscriptionScreen />} />
        <Route path="subscriptions/:id/edit" element={<AddSubscriptionScreen />} />
        <Route path="commitments" element={<CommitmentsScreen />} />
        <Route path="commitments/new" element={<AddCommitmentScreen />} />
        <Route path="commitments/:id/edit" element={<AddCommitmentScreen />} />
        <Route path="goals" element={<GoalsScreen />} />
        <Route path="recurring" element={<RecurringScreen />} />
        <Route path="recurring/new" element={<AddRecurringScreen />} />
        <Route path="recurring/:id/edit" element={<AddRecurringScreen />} />
        <Route path="recurring/:id/confirm" element={<ConfirmRecurringScreen />} />
        <Route path="loans/new" element={<AddPersonScreen />} />
        <Route path="loans/:personId" element={<PersonDetailScreen />} />
        <Route path="loans/:personId/edit" element={<AddPersonScreen />} />
        <Route path="loans/:personId/add" element={<AddLoanScreen />} />
        <Route path="loans/:personId/edit/:loanId" element={<AddLoanScreen />} />
        <Route path="sync-settings" element={<SyncSettingsScreen />} />
        <Route path="reports" element={<ReportsScreen />} />
        <Route path="comparisons" element={<ComparisonsScreen />} />
        <Route path="export-report" element={<ExportReportScreen />} />
        <Route path="about" element={<AboutScreen />} />
        <Route path="security" element={<SecurityScreen />} />
        <Route path="security/change-pin" element={<ChangePinScreen />} />
        <Route path="calculator" element={<CalculatorScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
