import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CompletionStat, SmartCourse, SmartModule } from '../types';
import { coursesAPI } from './apiService';
import { useAuth } from './authContext';

interface CourseContextType {
  courses: SmartCourse[];
  isLoading: boolean;
  error: string | null;
  addCourse: (course: SmartCourse) => Promise<string>;
  updateCourse: (courseId: string, updatedFields: Partial<SmartCourse>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  updateModuleStatus: (courseId: string, moduleId: string, status: SmartModule['status']) => Promise<void>;
  completeActivity: (courseId: string, moduleId: string, type: 'quiz' | 'coding' | 'revision') => Promise<void>;
  refreshCourses: () => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const zeroStats = { completed: 0, total: 0 };

const buildYouTubeThumbnail = (url?: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else {
      videoId = parsed.searchParams.get('v') || '';
      if (!videoId && parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      }
      if (!videoId && parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
      }
    }
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
};

const resolveCourseThumbnail = (item: any) => {
  const thumbnail = item?.thumbnail || '';
  const youtubeThumbnail = buildYouTubeThumbnail(item?.youtube_url || item?.youtubeUrl);
  if (!thumbnail) return youtubeThumbnail || 'https://picsum.photos/seed/course/200/120';
  if (thumbnail.includes('picsum.photos')) return youtubeThumbnail || thumbnail;
  return thumbnail;
};

const buildCompletionStat = (completed: number, total: number): CompletionStat => ({
  completed: Math.max(0, completed),
  total: Math.max(0, total),
});

const summarizeCourseDetail = (detail: any, originalItem?: any) => {
  const modules = Array.isArray(detail?.modules) ? detail.modules : [];
  const quizTotal = modules.reduce((sum: number, module: any) => sum + (Array.isArray(module.quizzes) ? module.quizzes.length : 0), 0);
  const challengeTotal = modules.reduce((sum: number, module: any) => sum + (Array.isArray(module.coding_challenges) ? module.coding_challenges.length : 0), 0);
  const revisionTotal = modules.reduce((sum: number, module: any) => sum + (Array.isArray(module.revision_sessions) ? module.revision_sessions.length : 0), 0);
  const totalLessons = modules.length || detail?.total_lessons || 0;
  const progress = Number(detail?.progress || 0);
  const completedLessons = Math.min(totalLessons, Math.max(0, Math.round((progress / 100) * totalLessons)));

  return {
    id: String(detail?.id ?? ''),
    title: detail?.title,
    youtubeUrl: detail?.youtube_url || detail?.youtubeUrl,
    thumbnail: detail?.thumbnail,
    videoDuration: detail?.video_duration || detail?.videoDuration,
    startDate: detail?.start_date || detail?.startDate,
    dailyTime: detail?.daily_learning_time_minutes ? `${detail.daily_learning_time_minutes} mins/day` : detail?.dailyTime,
    progress,
    status: detail?.status,
    modules: buildCompletionStat(completedLessons, totalLessons),
    quizzes: buildCompletionStat(originalItem?.quizzes?.completed || 0, quizTotal),
    codingChallenges: buildCompletionStat(originalItem?.coding_challenges?.completed || originalItem?.codingChallenges?.completed || 0, challengeTotal),
    revisions: buildCompletionStat(originalItem?.revisions?.completed || 0, revisionTotal),
    difficulty: detail?.difficulty,
    language: detail?.language,
  } satisfies Partial<SmartCourse>;
};

const isPreparedCourse = (item: any) => {
  const modules = Array.isArray(item?.modules) ? item.modules : [];
  const totalLessons = modules.length || Number(item?.total_lessons || 0);
  return totalLessons > 0 && modules.length > 0;
};

const mapCourse = (item: any): SmartCourse => ({
  id: String(item.course || item.id),
  title: item.title || item.course_title || 'Untitled Course',
  youtubeUrl: item.youtube_url || item.youtubeUrl || '',
  thumbnail: resolveCourseThumbnail(item),
  videoDuration: item.video_duration || item.videoDuration || '00:00:00',
  startDate: item.start_date || item.startDate || '',
  dailyTime: item.daily_learning_time_minutes ? `${item.daily_learning_time_minutes} mins/day` : item.dailyTime,
  progress: item.progress || 0,
  status: item.status || 'not_started',
  modules: item.modules || buildCompletionStat(item.completed_lessons || 0, item.course_total_lessons || item.total_lessons || 0),
  quizzes: item.quizzes || zeroStats,
  codingChallenges: item.codingChallenges || item.coding_challenges || zeroStats,
  revisions: item.revisions || zeroStats,
  difficulty: item.difficulty || item.course_difficulty || 'Beginner',
  language: item.language || 'English',
});

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [courses, setCourses] = useState<SmartCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCourses = async () => {
    if (!isAuthenticated) {
      setCourses([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await coursesAPI.myCourses();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected course response from server.');
      }
      const enrichedCourses = await Promise.all(
        data.map(async (item: any) => {
          try {
            const courseId = item.course || item.id;
            if (!courseId || String(courseId) === 'undefined') {
              return mapCourse(item);
            }
            const detail = await coursesAPI.getCourse(courseId);
            if (!isPreparedCourse(detail)) {
              return null;
            }
            return mapCourse({ ...item, ...summarizeCourseDetail(detail, item) });
          } catch {
            return mapCourse(item);
          }
        })
      );
      setCourses(enrichedCourses.filter(Boolean) as SmartCourse[]);
    } catch (err: any) {
      setCourses([]);
      const message = err?.message || 'Unable to load courses from SQLite.';
      setError(message);
      if (message.toLowerCase().includes('session expired')) {
        logout();
      } else {
        console.error('Failed to load courses from FastAPI SQLite backend:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncCourses();
  }, [isAuthenticated]);

  const addCourse = async (course: SmartCourse): Promise<string> => {
    await syncCourses();
    return course.id;
  };

  const updateCourse = async (courseId: string, updatedFields: Partial<SmartCourse>) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...updatedFields } : c))
    );
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await coursesAPI.deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete course.');
      await syncCourses();
    }
  };

  const updateModuleStatus = async (courseId: string, moduleId: string, status: SmartModule['status']) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const newModulesCompleted = status === 'completed'
          ? Math.min(c.modules.completed + 1, c.modules.total)
          : Math.max(c.modules.completed - 1, 0);

        const updated = {
          ...c,
          modules: { ...c.modules, completed: newModulesCompleted }
        };

        const totalPossible = c.modules.total + c.quizzes.total + c.codingChallenges.total + c.revisions.total;
        const totalDone = newModulesCompleted + c.quizzes.completed + c.codingChallenges.completed + c.revisions.completed;
        updated.progress = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

        if (updated.progress === 100) {
          updated.status = 'completed';
        } else if (updated.progress > 0) {
          updated.status = 'in_progress';
        }

        return updated;
      })
    );
  };

  const completeActivity = async (courseId: string, moduleId: string, type: 'quiz' | 'coding' | 'revision') => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;

        const updated = { ...c };
        if (type === 'quiz') {
          updated.quizzes = { ...c.quizzes, completed: Math.min(c.quizzes.completed + 1, c.quizzes.total) };
        } else if (type === 'coding') {
          updated.codingChallenges = {
            ...c.codingChallenges,
            completed: Math.min(c.codingChallenges.completed + 1, c.codingChallenges.total)
          };
        } else if (type === 'revision') {
          updated.revisions = { ...c.revisions, completed: Math.min(c.revisions.completed + 1, c.revisions.total) };
        }

        const totalPossible = c.modules.total + c.quizzes.total + c.codingChallenges.total + c.revisions.total;
        const totalDone = c.modules.completed + updated.quizzes.completed + updated.codingChallenges.completed + updated.revisions.completed;
        updated.progress = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

        if (updated.progress === 100) {
          updated.status = 'completed';
        } else if (updated.progress > 0) {
          updated.status = 'in_progress';
        }

        return updated;
      })
    );
  };

  return (
    <CourseContext.Provider value={{
      courses,
      isLoading,
      error,
      addCourse,
      updateCourse,
      deleteCourse,
      updateModuleStatus,
      completeActivity,
      refreshCourses: syncCourses
    }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
