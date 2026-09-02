'use client';
import { useIntakeStore } from '@/store/intakeStore';
import { TextArea, Notice } from '@/components/ui';

const PROMPTS: { field: 'moment' | 'involvement' | 'actions' | 'enjoyment'; label: string }[] = [
  {
    field: 'moment',
    label:
      'Think back through the last 15 years of your career. In one of your jobs, identify a specific task, project, responsibility, or moment where the work came naturally to you. This should be a time when you were at your best and felt deeply satisfied. Make sure to include any details that are important to you.',
  },
  { field: 'involvement', label: 'What got you involved in this task, project, responsibility, or moment?' },
  { field: 'actions', label: 'What specific actions did you take?' },
  { field: 'enjoyment', label: 'What about those actions were particularly enjoyable to you?' },
];

export function StoryScreen({ storyIndex }: { storyIndex: number }) {
  const story = useIntakeStore((s) => s.answers.stories[storyIndex]);
  const setStory = useIntakeStore((s) => s.setStory);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Story {storyIndex + 1} of 4</p>
        <h2 className="mt-1 text-xl font-bold">Career Highlight Story {storyIndex + 1}</h2>
      </div>
      {storyIndex === 3 && (
        <Notice tone="info">
          This 4th story is optional — at least 3 of the 4 stories must be complete to submit, but a
          4th adds signal if you have one.
        </Notice>
      )}
      {PROMPTS.map((p) => (
        <TextArea
          key={p.field}
          label={p.label}
          value={story[p.field]}
          onChange={(v) => setStory(storyIndex, p.field, v)}
          rows={p.field === 'moment' ? 5 : 3}
        />
      ))}
    </div>
  );
}
