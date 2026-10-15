import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { UsersPage } from './pages/admin/UsersPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AttemptPage } from './pages/AttemptPage'
import { CoursePage } from './pages/CoursePage'
import { DashboardPage } from './pages/DashboardPage'
import { ExamPage } from './pages/ExamPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResultsPage } from './pages/ResultsPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="courses/:courseId" element={<CoursePage />} />
          <Route path="exams/:examId" element={<ExamPage />} />
          <Route path="attempts/:attemptId" element={<AttemptPage />} />
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route path="results" element={<ResultsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
