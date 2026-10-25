/**
 * Curriculum & Lessons System
 * Defines structured learning paths for Classes 1-6 with topics, lessons, and activities.
 * Each activity is renderer-safe and isolated from answer keys.
 */

export const CURRICULUM_STRUCTURE = {
  grades: {
    '1st Grade': {
      id: 'grade_1',
      subjects: ['Phonics', 'Sight Words', 'Basic Reading'],
      topics: {
        'Phonics': [
          {
            id: 'phonics_1_a',
            title: 'Letter Sound: A',
            difficulty: 1,
            activities: 3,
            prerequisites: []
          },
          {
            id: 'phonics_1_b',
            title: 'Letter Sound: B',
            difficulty: 1,
            prerequisites: []
          },
          {
            id: 'phonics_1_vowels',
            title: 'All Vowel Sounds',
            difficulty: 2,
            prerequisites: ['phonics_1_a']
          }
        ],
        'Sight Words': [
          {
            id: 'sight_1_common',
            title: 'Common Sight Words (The, A, Is)',
            difficulty: 1,
            prerequisites: []
          }
        ]
      }
    },
    '2nd Grade': {
      id: 'grade_2',
      subjects: ['Word Families', 'Simple Sentences', 'Phonics'],
      topics: {
        'Word Families': [
          {
            id: 'families_2_at',
            title: 'Word Family: -at (cat, bat, mat)',
            difficulty: 1,
            prerequisites: []
          },
          {
            id: 'families_2_mixed',
            title: 'Mixed Word Families',
            difficulty: 2,
            prerequisites: ['families_2_at']
          }
        ]
      }
    },
    '3rd Grade': {
      id: 'grade_3',
      subjects: ['Blending', 'Comprehension', 'Fluency'],
      topics: {
        'Blending': [
          {
            id: 'blend_3_consonant',
            title: 'Consonant Blends (bl, cr, st)',
            difficulty: 2,
            prerequisites: []
          }
        ]
      }
    },
    '4th Grade': {
      id: 'grade_4',
      subjects: ['Vocabulary', 'Comprehension', 'Writing'],
      topics: {
        'Vocabulary': [
          {
            id: 'vocab_4_context',
            title: 'Words from Context Clues',
            difficulty: 2,
            prerequisites: []
          }
        ]
      }
    },
    '5th Grade': {
      id: 'grade_5',
      subjects: ['Complex Text', 'Analysis', 'Expression'],
      topics: {
        'Complex Text': [
          {
            id: 'complex_5_inference',
            title: 'Making Inferences',
            difficulty: 3,
            prerequisites: []
          }
        ]
      }
    },
    '6th Grade': {
      id: 'grade_6',
      subjects: ['Critical Reading', 'Advanced Analysis', 'Expression'],
      topics: {
        'Critical Reading': [
          {
            id: 'critical_6_main_idea',
            title: 'Main Idea and Supporting Details',
            difficulty: 3,
            prerequisites: []
          }
        ]
      }
    }
  }
};

/**
 * Activity templates for the learning engine.
 * Defines the structure, type, and renderer-safe spec for each activity.
 */
export const ACTIVITY_TEMPLATES = {
  'multiple_choice': {
    type: 'choose',
    title: 'Multiple Choice',
    modes: ['sentence_mc', 'sound_detect'],
    timeLimit: 60000,
    feedbackDelay: 1500
  },
  'true_false': {
    type: 'choose',
    title: 'True or False',
    modes: ['sentence_mc'],
    timeLimit: 45000,
    feedbackDelay: 1500
  },
  'fill_blank': {
    type: 'build',
    title: 'Fill in the Blank',
    modes: ['word_build'],
    timeLimit: 90000,
    feedbackDelay: 2000
  },
  'matching': {
    type: 'choose',
    title: 'Matching',
    modes: ['sentence_mc'],
    timeLimit: 120000,
    feedbackDelay: 1500
  },
  'spelling': {
    type: 'build',
    title: 'Spell the Word',
    modes: ['word_build', 'syllable_split'],
    timeLimit: 90000,
    feedbackDelay: 2000
  },
  'reading_comprehension': {
    type: 'choose',
    title: 'Reading Comprehension',
    modes: ['sentence_mc'],
    timeLimit: 120000,
    feedbackDelay: 1500
  }
};

/**
 * Get the lesson map for a grade with locked/unlocked states.
 * @param {string} gradeLevel - e.g. '1st Grade'
 * @param {object} progress - Learning progress object from profile
 * @returns {array} Lesson map with completion states
 */
export function getLessonMap(gradeLevel, progress = {}) {
  const gradeData = CURRICULUM_STRUCTURE.grades[gradeLevel];
  if (!gradeData) return [];

  const completedTopics = progress.completedTopics || [];
  const inProgressTopics = progress.inProgressTopics || {};

  const lessonMap = [];

  Object.entries(gradeData.topics).forEach(([subject, lessons]) => {
    lessons.forEach((lesson, idx) => {
      const prereqsMet = lesson.prerequisites.every(prereq =>
        completedTopics.includes(prereq)
      );

      const isCompleted = completedTopics.includes(lesson.id);
      const isInProgress = lesson.id in inProgressTopics;
      const isLocked = !prereqsMet && !isCompleted;

      lessonMap.push({
        ...lesson,
        subject,
        order: idx,
        state: isCompleted ? 'completed' : isLocked ? 'locked' : isInProgress ? 'in_progress' : 'available',
        progressPercent: inProgressTopics[lesson.id] || 0,
        unlockReason: isLocked ? `Complete: ${lesson.prerequisites.map(p => `"${p}"`).join(', ')}` : null
      });
    });
  });

  return lessonMap;
}

/**
 * Get activities for a specific lesson.
 * Renderer-safe specs; no answer keys included.
 * @param {string} lessonId
 * @param {number} activityIndex - Which activity in the lesson (0-based)
 * @returns {object} Renderer-safe activity spec
 */
export function getActivityForLesson(lessonId, activityIndex = 0) {
  // This returns a template activity. In production, this would fetch
  // from a database of curated activities per lesson.

  const activities = [
    {
      id: `${lessonId}_activity_${activityIndex}`,
      lessonId,
      type: 'multiple_choice',
      mode: 'sentence_mc',
      title: 'Practice Question',
      prompt: 'Which word has the short "a" sound?',
      timeLimit: 60000,
      presentation: {
        mode: 'text',
        audioPrompt: 'Which word has the short a sound?',
        ttsRate: 0.85,
        replayEnabled: true
      },
      options: [
        { id: 'opt_1', label: 'Make', audioLabel: 'Make' },
        { id: 'opt_2', label: 'Cat', audioLabel: 'Cat' },
        { id: 'opt_3', label: 'Cake', audioLabel: 'Cake' }
      ],
      hints: [
        'Think about short vowel sounds',
        'The "a" sounds like in "apple"'
      ],
      explanation: 'The word "cat" has the short "a" sound, like in apple, ant, and ask.'
    }
  ];

  return activities[Math.min(activityIndex, activities.length - 1)];
}
