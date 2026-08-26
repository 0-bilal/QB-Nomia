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
import { PeopleListScreen } from './screens/loans/PeopleListScreen'
import { AddPersonScreen } from './screens/loans/AddPersonScreen'
import { PersonDetailScreen } from './screens/loans/PersonDetailScreen'
import { AddLoanScreen } from './screens/loans/AddLoanScreen'

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
        <Route path="add/transaction" element={<AddTransactionScreen />} />
        <Route path="categories" element={<CategoriesScreen />} />
        <Route path="categories/new" element={<AddCategoryScreen />} />
        <Route path="income-sources" element={<IncomeSourcesScreen />} />
        <Route path="income-sources/new" element={<AddIncomeSourceScreen />} />
        <Route path="subscriptions" element={<SubscriptionsScreen />} />
        <Route path="subscriptions/new" element={<AddSubscriptionScreen />} />
        <Route path="loans/new" element={<AddPersonScreen />} />
        <Route path="loans/:personId" element={<PersonDetailScreen />} />
        <Route path="loans/:personId/add" element={<AddLoanScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
