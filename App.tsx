
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './services/authContext';
import { LoginScreen } from './screens/Login';
import { RegisterScreen } from './screens/Register';
import { DashboardScreen } from './screens/Dashboard';
import { QuizScreen } from './screens/Quiz';
import { PracticeLabScreen } from './screens/PracticeLab';
import { ProctoringScreen } from './screens/Proctoring';
import { ExamResultsScreen } from './screens/ExamResults';
import { AnalyticsScreen } from './screens/Analytics';
import { LiveExamScreen } from './screens/LiveExam';
import { ExamsScreen } from './screens/Exams';
import { FacultyDashboardScreen } from './screens/FacultyDashboard';
import { FacultyExamCreateScreen } from './screens/FacultyExamCreate';
import { FacultyExamsScreen } from './screens/FacultyExams';
import { LiveMonitoringScreen } from './screens/LiveMonitoring';
import { ExamAnalyticsScreen } from './screens/ExamAnalytics';
import { StudentManagementScreen } from './screens/StudentManagement';
import { FacultyProctoringSettingsScreen } from './screens/FacultyProctoringSettings';
import { FacultyDisputesScreen } from './screens/FacultyDisputes';
import { FacultyAnalyticsScreen } from './screens/FacultyAnalytics';
import { SettingsScreen } from './screens/Settings';
import { HelpCenterScreen } from './screens/HelpCenter';
import { FacultyReportsScreen } from './screens/FacultyReports';
import { ProctoringTestScreen } from './screens/ProctoringTest';
import { MyCoursesScreen } from './screens/MyCourses';
import { CourseDetailScreen } from './screens/CourseDetail';
import { CreateCourseScreen } from './screens/CreateCourse';
import { VideoLearningScreen } from './screens/VideoLearning';
import { LearningPathAgentScreen } from './screens/LearningPathAgentFull';
import { FacultyInterventionsScreen } from './screens/FacultyInterventions';
import { CodeRemediationScreen } from './screens/CodeRemediation';
import { CourseProvider } from './services/courseContext';
import { dashboardPathForRole, isFacultyRole } from './services/roles';

const facultyRoutes = new Set([
  '/faculty-dashboard',
  '/faculty-interventions',
  '/faculty-exams',
  '/faculty-exams/create',
  '/faculty-settings',
  '/faculty-disputes',
  '/faculty-analytics',
  '/reports',
  '/live-monitoring',
  '/students',
]);

const studentRoutes = new Set([
  '/dashboard',
  '/learning-path',
  '/learning-path-agent',
  '/mastery-assessment',
  '/gap-diagnosis',
  '/path-sequencing',
  '/teacher-notification',
  '/courses',
  '/create-course',
  '/exams',
  '/code-remediation',
  '/analytics',
]);

const isFacultyRoute = (path: string) =>
  facultyRoutes.has(path) || path.startsWith('/exam-analytics') || path.startsWith('/exam-details');

const isStudentRoute = (path: string) =>
  studentRoutes.has(path) || path.startsWith('/course/') || path.startsWith('/quiz') || path.startsWith('/lab') ||
  path.startsWith('/proctoring') || path.startsWith('/live-exam') || path === '/exam-results' || path === '/proctoring-test';

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/login');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/login';
      setCurrentPath(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // After auth loads, redirect appropriately
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && (currentPath === '/login' || currentPath === '/register')) {
        navigate(dashboardPathForRole(user?.role));
      } else if (!isAuthenticated && currentPath !== '/login' && currentPath !== '/register') {
        navigate('/login');
      } else if (isAuthenticated && user) {
        const faculty = isFacultyRole(user.role);
        if (faculty && isStudentRoute(currentPath) && currentPath !== '/settings' && currentPath !== '/help') {
          navigate('/faculty-dashboard');
        } else if (!faculty && isFacultyRoute(currentPath)) {
          navigate('/dashboard');
        }
      }
    }
  }, [isLoading, isAuthenticated, currentPath, user?.role]);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <RegisterScreen onNavigate={navigate} />;
    }
    return <LoginScreen onNavigate={navigate} />;
  }

  // Protected routes
  return (
    <div className="font-sans antialiased text-slate-900 bg-white min-h-screen">
      {currentPath === '/dashboard' ? (
        <DashboardScreen onNavigate={navigate} />
      ) : currentPath === '/learning-path' || currentPath === '/learning-path-agent' || currentPath === '/mastery-assessment' || currentPath === '/gap-diagnosis' || currentPath === '/path-sequencing' || currentPath === '/teacher-notification' ? (
        <LearningPathAgentScreen onNavigate={navigate} currentPath={currentPath} />
      ) : currentPath === '/faculty-interventions' ? (
        <FacultyInterventionsScreen onNavigate={navigate} />
      ) : currentPath === '/courses' ? (
        <MyCoursesScreen onNavigate={navigate} />
      ) : currentPath === '/create-course' ? (
        <CreateCourseScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/course/') && (currentPath.includes('/learn') || currentPath.endsWith('/learn')) ? (
        <VideoLearningScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/course/') ? (
        <CourseDetailScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-dashboard' ? (
        <FacultyDashboardScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-exams' || currentPath.startsWith('/exam-details') ? (
        <FacultyExamsScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-exams/create' ? (
        <FacultyExamCreateScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-settings' ? (
        <FacultyProctoringSettingsScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-disputes' ? (
        <FacultyDisputesScreen onNavigate={navigate} />
      ) : currentPath === '/faculty-analytics' ? (
        <FacultyAnalyticsScreen onNavigate={navigate} />
      ) : currentPath === '/reports' ? (
        <FacultyReportsScreen onNavigate={navigate} />
      ) : currentPath === '/live-monitoring' ? (
        <LiveMonitoringScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/exam-analytics') ? (
        <ExamAnalyticsScreen onNavigate={navigate} />
      ) : currentPath === '/students' ? (
        <StudentManagementScreen onNavigate={navigate} />
      ) : currentPath === '/exams' ? (
        <ExamsScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/code-remediation') ? (
        <CodeRemediationScreen onNavigate={navigate} />
      ) : currentPath === '/analytics' ? (
        <AnalyticsScreen onNavigate={navigate} />
      ) : currentPath === '/settings' ? (
        <SettingsScreen onNavigate={navigate} />
      ) : currentPath === '/help' ? (
        <HelpCenterScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/quiz') ? (
        <QuizScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/lab') ? (
        <PracticeLabScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/proctoring') ? (
        <ProctoringScreen onNavigate={navigate} />
      ) : currentPath.startsWith('/live-exam') ? (
        <LiveExamScreen onNavigate={navigate} />
      ) : currentPath === '/exam-results' ? (
        <ExamResultsScreen onNavigate={navigate} />
      ) : currentPath === '/proctoring-test' ? (
        <ProctoringTestScreen onNavigate={navigate} />
      ) : (
        // Default: redirect based on role
        isFacultyRole(user?.role) ? (
          <FacultyDashboardScreen onNavigate={navigate} />
        ) : (
          <DashboardScreen onNavigate={navigate} />
        )
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CourseProvider>
        <AppRoutes />
      </CourseProvider>
    </AuthProvider>
  );
};

export default App;
