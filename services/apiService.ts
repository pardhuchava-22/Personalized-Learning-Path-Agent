/**
 * API Service for Django Backend Communication
 * Handles JWT authentication, exams, courses, questions, and proctoring.
 */

const API_BASE = 'http://localhost:8000/api';

// ─── Token Management ──────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
}

function setUserData(user: any): void {
  localStorage.setItem('user_data', JSON.stringify(user));
}

function getUserData(): any | null {
  const data = localStorage.getItem('user_data');
  return data ? JSON.parse(data) : null;
}

// ─── HTTP Helper ────────────────────────────────────────────────────
async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const isFormData = options.body instanceof FormData;
  const finalHeaders: Record<string, string> = { ...headers };
  if (isFormData) {
    delete finalHeaders['Content-Type'];
  }

  const response = await fetch(url, { ...options, headers: finalHeaders });

  // If 401, try to refresh token
  if (response.status === 401 && requireAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || error.error || JSON.stringify(error));
      }
      return retryResponse.json().catch(() => null);
    } else {
      clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(error.detail || error.error || JSON.stringify(error));
  }

  return response.json().catch(() => null);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── AUTH API ──────────────────────────────────────────────────────
export const authAPI = {
  async login(username: string, password: string): Promise<{ user: any; tokens: { access: string; refresh: string } }> {
    const tokenResponse = await fetch(`${API_BASE}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid credentials. Please check your username and password.');
    }

    const tokens = await tokenResponse.json();
    setTokens(tokens.access, tokens.refresh);

    const userResponse = await fetch(`${API_BASE}/users/profile/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.access}`,
      },
    });

    let user: any = { username, role: 'student' };
    if (userResponse.ok) {
      user = await userResponse.json();
    }

    setUserData(user);
    return { user, tokens };
  },

  async register(data: {
    username: string; email: string; password: string;
    password_confirm: string; role?: string; first_name?: string;
    last_name?: string; department?: string; institution?: string;
  }): Promise<any> {
    return apiRequest('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },

  async getProfile(): Promise<any> {
    return apiRequest('/users/profile/');
  },

  async updateProfile(data: any): Promise<any> {
    return apiRequest('/users/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async changePassword(oldPassword?: string, newPassword?: string): Promise<any> {
    return apiRequest('/users/change_password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  },

  logout(): void {
    clearTokens();
  },

  isLoggedIn(): boolean {
    return !!getToken();
  },

  getUser(): any | null {
    return getUserData();
  },
};

// ─── USERS API ─────────────────────────────────────────────────────
export const usersAPI = {
  /** Get all students — faculty/admin only */
  async getStudents(): Promise<any[]> {
    return apiRequest('/users/students/');
  },

  /** Add a new student record — admin only */
  async addStudent(data: any): Promise<any> {
    return apiRequest('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update an existing student record — admin only */
  async updateStudent(id: string | number, data: any): Promise<any> {
    return apiRequest(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a student record — admin only */
  async deleteStudent(id: string | number): Promise<any> {
    return apiRequest(`/users/${id}/`, {
      method: 'DELETE',
    });
  },

  /** Reset a student's password — faculty/admin only */
  async resetPassword(id: string | number, password: string): Promise<any> {
    return apiRequest(`/users/${id}/reset_password/`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
};

// ─── COURSES API ───────────────────────────────────────────────────
export const coursesAPI = {
  /** List all available courses. */
  async listCourses(): Promise<any> {
    return apiRequest('/exams/courses/');
  },

  /** Get courses the current student is enrolled in (with progress). */
  async myCourses(): Promise<any> {
    return apiRequest('/exams/courses/my_courses/');
  },

  /** Enroll in a course. */
  async enroll(courseId: number | string): Promise<any> {
    return apiRequest(`/exams/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** Get single course. */
  async getCourse(id: number | string): Promise<any> {
    return apiRequest(`/exams/courses/${id}/`);
  },

  /** Create a course (instructor only). */
  async createCourse(data: any): Promise<any> {
    return apiRequest('/exams/courses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Trigger smart course generation queue pipeline */
  async generateCourse(data: any): Promise<any> {
    return apiRequest('/exams/courses/generate/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Poll course generation progress status */
  async checkGenerationStatus(taskId: string): Promise<any> {
    return apiRequest(`/exams/courses/generation-status/${taskId}`);
  },

  /** Retry failed generation task steps */
  async retryGeneration(taskId: string): Promise<any> {
    return apiRequest(`/exams/courses/generate/retry/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** Retrieve currently running background generation task */
  async getPendingTasks(): Promise<any> {
    return apiRequest('/exams/courses/pending-tasks');
  },

  /** Verify integrity and relationship mappings of a generated course */
  async verifyCourse(courseId: number | string): Promise<any> {
    return apiRequest(`/exams/courses/verify/${courseId}`);
  },

  /** Delete a course. */
  async deleteCourse(courseId: number | string): Promise<any> {
    return apiRequest(`/exams/courses/${courseId}/`, {
      method: 'DELETE',
    });
  },

  /** Fetch individual module details. */
  async getModule(moduleId: number | string): Promise<any> {
    return apiRequest(`/module/${moduleId}`);
  },

  /** Update video learning progress. */
  async updateVideoProgress(moduleId: number | string, watchTimeSeconds: number, isCompleted: boolean): Promise<any> {
    return apiRequest(`/module/${moduleId}/progress`, {
      method: 'POST',
      body: JSON.stringify({
        watch_time_seconds: watchTimeSeconds,
        is_completed: isCompleted
      })
    });
  },

  /** Send chat question to AI Coach. */
  async chatWithCoach(moduleId: number | string, message: string): Promise<any> {
    return apiRequest(`/module/${moduleId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  /** Fetch quiz for module. */
  async getModuleQuiz(moduleId: number | string): Promise<any> {
    return apiRequest(`/module/${moduleId}/quiz`);
  },

  /** Record quiz score and attempts. */
  async submitQuiz(quizId: number | string, scorePercentage: number, isPassed: boolean): Promise<any> {
    return apiRequest('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        quiz_id: quizId,
        score_percentage: scorePercentage,
        is_passed: isPassed
      })
    });
  },

  /** Fetch coding challenge for module. */
  async getModuleChallenge(moduleId: number | string): Promise<any> {
    return apiRequest(`/module/${moduleId}/challenge`);
  },

  /** Save challenge submissions. */
  async submitChallenge(challengeId: number | string, submittedCode: string, isPassed: boolean, feedback: string): Promise<any> {
    return apiRequest('/challenge/submit', {
      method: 'POST',
      body: JSON.stringify({
        challenge_id: challengeId,
        submitted_code: submittedCode,
        is_passed: isPassed,
        feedback: feedback
      })
    });
  },

  /** Get resume route for a course — computes exact next pending activity. */
  async getCourseResume(courseId: number | string): Promise<any> {
    return apiRequest(`/exams/courses/${courseId}/resume/`);
  },
};

// ─── EXAMS API ──────────────────────────────────────────────────────
export const examsAPI = {
  async listExams(): Promise<any> {
    return apiRequest('/exams/exams/');
  },

  async getExam(id: number | string): Promise<any> {
    return apiRequest(`/exams/exams/${id}/`);
  },

  async checkStatus(examId: string | number): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/check_status/`);
  },

  async createExam(examData: any): Promise<any> {
    return apiRequest('/exams/exams/', {
      method: 'POST',
      body: JSON.stringify(examData),
    });
  },

  async updateExam(id: number | string, data: any): Promise<any> {
    return apiRequest(`/exams/exams/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createFromScratch(examData: any): Promise<any> {
    return apiRequest('/exams/exams/create_from_scratch/', {
      method: 'POST',
      body: JSON.stringify(examData),
    });
  },

  async generateAIContent(data: {
    youtube_url: string;
    difficulty: string;
    count: number;
    include_coding: boolean;
  }): Promise<any> {
    return apiRequest('/exams/exams/generate_ai_content/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async enrollInExam(examId: number | string): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async startExam(examId: number | string): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/start/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async submitExam(examId: number | string, answers: any = {}, timeTakenSeconds: number = 0, isAutoSubmit: boolean = false): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({
        answers,
        time_taken_seconds: timeTakenSeconds,
        is_auto_submit: isAutoSubmit
      }),
    });
  },

  async getMyExams(): Promise<any> {
    return apiRequest('/exams/exams/my_exams/');
  },

  /** Dashboard stats for both student and faculty. */
  async getDashboardStats(): Promise<any> {
    return apiRequest('/exams/exams/dashboard_stats/');
  },

  /** Detailed examination-centric analytics for students. */
  async getDetailedAnalytics(): Promise<any> {
    return apiRequest('/exams/exams/student_detailed_analytics/');
  },

  /** Faculty-specific analytics — overview of all students and exams. */
  async getFacultyAnalytics(period?: string): Promise<any> {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return apiRequest(`/exams/analytics/faculty/${query}`);
  },

  /** Get detailed results for a specific exam — faculty/admin only. */
  async getExamResultsDetail(examId: string | number): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/results_detail/`);
  },

  /** Block a student from an exam — faculty/admin only. */
  async blockStudent(examId: string | number, studentId: string | number): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/block_enrollment/`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId }),
    });
  },

  /** Unblock a student from an exam — faculty/admin only. */
  async unblockStudent(examId: string | number, studentId: string | number): Promise<any> {
    return apiRequest(`/exams/exams/${examId}/unblock_enrollment/`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId }),
    });
  },
};

// ─── QUESTIONS API ──────────────────────────────────────────────────
export const questionsAPI = {
  async getExamQuestions(examId: number | string): Promise<any> {
    return apiRequest(`/questions/questions/?exam_id=${examId}`);
  },

  async createQuestion(data: any): Promise<any> {
    return apiRequest('/questions/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMCQDetail(questionId: number | string): Promise<any> {
    return apiRequest(`/questions/questions/${questionId}/detail_view/`);
  },
};

// ─── SUBMISSIONS API ────────────────────────────────────────────────
export const submissionsAPI = {
  async submitMCQAnswer(enrollmentId: number, questionId: number, optionId: number): Promise<any> {
    return apiRequest('/submissions/mcq/submit_answer/', {
      method: 'POST',
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        question_id: questionId,
        option_id: optionId,
      }),
    });
  },

  async submitCode(enrollmentId: number, questionId: number, code: string): Promise<any> {
    return apiRequest('/submissions/coding/submit_code/', {
      method: 'POST',
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        question_id: questionId,
        code,
      }),
    });
  },

  async executeCode(language: string, code: string, testCases: any[]): Promise<any> {
    return apiRequest('/submissions/coding/execute_code/', {
      method: 'POST',
      body: JSON.stringify({
        language,
        code,
        test_cases: testCases,
      }),
    });
  },
};

// ─── PROCTORING API ─────────────────────────────────────────────────
export const proctoringAPI = {
  async startSession(enrollmentId: number, deviceInfo?: any): Promise<any> {
    return apiRequest('/proctoring/sessions/start_session/', {
      method: 'POST',
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        device_info: deviceInfo || {},
      }),
    });
  },

  async endSession(sessionId: number): Promise<any> {
    return apiRequest(`/proctoring/sessions/${sessionId}/end_session/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async reportViolation(data: {
    enrollment_id: number;
    violation_type: string;
    description?: string;
    severity?: string;
    snapshot?: string;
    detections?: any;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('enrollment_id', data.enrollment_id.toString());
    formData.append('violation_type', data.violation_type);
    if (data.description) formData.append('description', data.description);
    if (data.severity) formData.append('severity', data.severity);
    if (data.detections) formData.append('detections', JSON.stringify(data.detections));
    
    if (data.snapshot && data.snapshot.startsWith('data:')) {
      const res = await fetch(data.snapshot);
      const blob = await res.blob();
      formData.append('evidence_screenshot', blob, 'violation.jpg');
    }

    return apiRequest('/proctoring/violations/report_violation/', {
      method: 'POST',
      body: formData,
    });
  },

  async logActivity(sessionId: number, activityType: string, description?: string): Promise<any> {
    return apiRequest('/proctoring/activities/log_activity/', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        activity_type: activityType,
        description: description || '',
      }),
    });
  },

  async uploadIDCard(enrollmentId: number, base64Image: string): Promise<any> {
    return apiRequest('/proctoring/sessions/upload_id_card/', {
      method: 'POST',
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        image: base64Image,
      }),
    });
  },
};

// ─── Personalized Learning Path Multi-Agent System API ──────────────
export const learningAgentAPI = {
  async getStudentExams(): Promise<any[]> {
    return apiRequest('/exams/learning-agent/student-exams/');
  },

  async diagnose(question: string, subject?: string, examId?: string | number): Promise<any> {
    return apiRequest('/exams/learning-agent/diagnose/', {
      method: 'POST',
      body: JSON.stringify({ question, subject, exam_id: examId }),
    });
  },

  async submitExercise(sessionId: number, exerciseIndex: number, selectedOption: number): Promise<any> {
    return apiRequest(`/exams/learning-agent/sessions/${sessionId}/submit-exercise/`, {
      method: 'POST',
      body: JSON.stringify({ exercise_index: exerciseIndex, selected_option: selectedOption }),
    });
  },

  async getSessions(): Promise<any[]> {
    return apiRequest('/exams/learning-agent/sessions/');
  },

  async getSession(sessionId: number): Promise<any> {
    return apiRequest(`/exams/learning-agent/sessions/${sessionId}/`);
  },

  async requestApproval(sessionId: number): Promise<any> {
    return apiRequest(`/exams/learning-agent/sessions/${sessionId}/request-approval/`, {
      method: 'POST',
    });
  },

  async adoptPath(sessionId: number): Promise<any> {
    return apiRequest(`/exams/learning-agent/sessions/${sessionId}/adopt/`, {
      method: 'POST',
    });
  },

  async getFacultyAlerts(): Promise<any[]> {
    return apiRequest('/exams/learning-agent/faculty/alerts/');
  },

  async submitFacultyAction(interventionId: number, action: string, notes?: string): Promise<any> {
    return apiRequest('/exams/learning-agent/faculty/action/', {
      method: 'POST',
      body: JSON.stringify({ intervention_id: interventionId, action, notes }),
    });
  },
};

// ─── Code Remediation Track API ──────────────────────────────────────
export const remediationAPI = {
  async getRemediationItems(): Promise<any[]> {
    return apiRequest('/exams/remediation/');
  },

  async submitPractice(itemId: number | string, code?: string, status = 'mastered'): Promise<any> {
    return apiRequest(`/exams/remediation/${itemId}/complete/`, {
      method: 'POST',
      body: JSON.stringify({ code: code || '', status }),
    });
  },
};

// ─── Notifications API ───────────────────────────────────────────────
export const notificationsAPI = {
  async getNotifications(): Promise<any[]> {
    return apiRequest('/exams/notifications/');
  },

  async markRead(id: number | string): Promise<any> {
    return apiRequest(`/exams/notifications/${id}/read/`, {
      method: 'POST',
    });
  },

  async markAllRead(): Promise<any> {
    return apiRequest('/exams/notifications/mark-all-read/', {
      method: 'POST',
    });
  },
};


