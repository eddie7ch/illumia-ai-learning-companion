import { useId, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { coursePresets } from '../data/coursePresets';
import type { Course } from '../services/courseService';

interface CourseSwitcherProps {
  courses: Course[];
  activeCourseId: string | null;
  onSelect: (courseId: string) => void;
  onAddPreset: (presetId: string) => Promise<void>;
  onAddCustom: (title: string, topics: string[]) => Promise<void>;
}

export default function CourseSwitcher({
  courses,
  activeCourseId,
  onSelect,
  onAddPreset,
  onAddCustom,
}: CourseSwitcherProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [tab, setTab] = useState<'preset' | 'custom'>('preset');
  const [customTitle, setCustomTitle] = useState('');
  const [customTopics, setCustomTopics] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const topicsId = useId();

  const handleAddPreset = async (presetId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddPreset(presetId);
      setIsPanelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustom = async () => {
    const title = customTitle.trim();
    if (!title) {
      setError('Give your course a name.');
      return;
    }
    const topics = customTopics
      .split('\n')
      .map((topic) => topic.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddCustom(title, topics);
      setCustomTitle('');
      setCustomTopics('');
      setIsPanelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-500 dark:text-slate-400" htmlFor="course-select">
          Course
        </label>
        <div className="relative">
          <select
            id="course-select"
            value={activeCourseId ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsPanelOpen((prev) => !prev)}
          aria-expanded={isPanelOpen}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New course
        </button>
      </div>

      {isPanelOpen && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:ring-slate-700">
          <div className="flex gap-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab('preset')}
              className={`rounded-full px-3 py-1 ${
                tab === 'preset'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Choose a preset
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={`rounded-full px-3 py-1 ${
                tab === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Build your own
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {tab === 'preset' ? (
            <ul className="mt-3 space-y-2">
              {coursePresets.map((preset) => (
                <li key={preset.id} className="flex items-center justify-between gap-3 rounded-md bg-white p-2.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{preset.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAddPreset(preset.id)}
                    className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 space-y-2">
              <div>
                <label htmlFor={titleId} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Course name
                </label>
                <input
                  id={titleId}
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="e.g. Rust for Backend Engineers"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor={topicsId} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Lessons/topics (one per line, optional)
                </label>
                <textarea
                  id={topicsId}
                  value={customTopics}
                  onChange={(event) => setCustomTopics(event.target.value)}
                  rows={4}
                  placeholder={'Ownership and borrowing\nError handling with Result\nBuild a CLI tool'}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateCustom}
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Create course
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
