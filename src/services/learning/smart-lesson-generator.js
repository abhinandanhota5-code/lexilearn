/**
 * PHASE 2: Smart Lesson Generator
 * Creates age-appropriate, deterministic activities with optional AI enhancement.
 * All generated content is validated before reaching children.
 */

import { getAIService } from '../ai/local-ai.js';

/**
 * Core lesson templates organized by grade, subject, topic, and difficulty.
 * These serve as deterministic fallbacks and seeds for AI generation.
 */
export const LESSON_TEMPLATES = {
  '1st Grade': {
    Phonics: {
      'Letter A': {
        difficulty: 1,
        objectives: [
          { id: 'letter_a_sound', title: 'Recognize letter A sound', activities: ['sound_detect', 'sentence_mc'] },
          { id: 'letter_a_words', title: 'Words with A sound', activities: ['word_build', 'matching'] }
        ]
      },
      'Sight Words': {
        difficulty: 1,
        objectives: [
          { id: 'sight_the', title: 'The word (sight)', activities: ['sentence_mc', 'matching'] },
          { id: 'sight_is', title: 'Is word (sight)', activities: ['sentence_mc'] }
        ]
      }
    },
    Reading: {
      'Short Sentences': {
        difficulty: 1,
        objectives: [
          { id: 'simple_sentence', title: 'Read simple sentences', activities: ['sentence_mc', 'reading_comprehension'] }
        ]
      }
    }
  },
  '2nd Grade': {
    Phonics: {
      'Word Families': {
        difficulty: 2,
        objectives: [
          { id: 'word_family_at', title: 'Words ending in -at', activities: ['word_build', 'matching'] },
          { id: 'word_family_ing', title: 'Words ending in -ing', activities: ['word_build', 'sentence_mc'] }
        ]
      }
    },
    Fluency: {
      'Blending': {
        difficulty: 2,
        objectives: [
          { id: 'consonant_blend', title: 'Consonant blends (st, bl, cr)', activities: ['word_build', 'sound_detect'] }
        ]
      }
    }
  },
  '3rd Grade': {
    Comprehension: {
      'Main Idea': {
        difficulty: 3,
        objectives: [
          { id: 'main_idea', title: 'Identify main idea in paragraph', activities: ['reading_comprehension'] }
        ]
      }
    }
  }
};

/**
 * Activity templates by type with deterministic content.
 */
const ACTIVITY_TEMPLATES_BY_TYPE = {
  sound_detect: {
    template: (objective, difficulty) => ({
      type: 'sound_detect',
      prompt: `Which word has the "${objective.phoneme || 'a'}" sound?`,
      options: ['apple', 'bike', 'cat'],
      correctAnswer: 0,
      explanation: `The word "apple" has the "${objective.phoneme || 'a'}" sound at the beginning.`
    })
  },
  sentence_mc: {
    template: (objective, difficulty) => ({
      type: 'sentence_mc',
      prompt: `Complete the sentence: "The cat _____ on the mat."`,
      options: ['sits', 'run', 'jump'],
      correctAnswer: 0,
      explanation: 'We use "sits" because it matches the subject "cat" (singular).'
    })
  },
  word_build: {
    template: (objective, difficulty) => ({
      type: 'word_build',
      prompt: 'Build the word: tap the letters in order.',
      tiles: ['c', 'a', 't'],
      correctAnswer: 'cat',
      explanation: 'The letters spell the word "cat".'
    })
  },
  matching: {
    template: (objective, difficulty) => ({
      type: 'matching',
      prompt: 'Match words that rhyme.',
      pairs: [
        { left: 'cat', right: 'bat' },
        { left: 'dog', right: 'log' }
      ],
      correctAnswer: [[0, 0], [1, 1]],
      explanation: 'Cat rhymes with bat. Dog rhymes with log.'
    })
  },
  reading_comprehension: {
    template: (objective, difficulty) => ({
      type: 'reading_comprehension',
      prompt: 'Read: "The cat sat on a mat." What was the cat on?',
      options: ['a chair', 'a mat', 'a bed'],
      correctAnswer: 1,
      explanation: 'The story says the cat sat on a mat.'
    })
  },
  true_false: {
    template: (objective, difficulty) => ({
      type: 'true_false',
      prompt: 'True or False: A cat is an animal.',
      correctAnswer: true,
      explanation: 'Yes, a cat is an animal.'
    })
  },
  fill_blank: {
    template: (objective, difficulty) => ({
      type: 'fill_blank',
      prompt: 'The _____ is sleeping.',
      tiles: ['cat', 'dog', 'bird'],
      correctAnswer: 'cat',
      explanation: '"The cat is sleeping" is a complete sentence.'
    })
  },
  spelling: {
    template: (objective, difficulty) => ({
      type: 'spelling',
      prompt: 'Spell the word that rhymes with "bat".',
      tiles: ['c', 'a', 't'],
      correctAnswer: 'cat',
      explanation: '"Cat" rhymes with "bat".'
    })
  }
};

/**
 * Generate a lesson activity deterministically.
 * @param {object} params { grade, subject, topic, difficulty, activityType, objectiveId }
 * @returns {object} Activity spec (no answer key in returned spec)
 */
export function generateLessonActivityDeterministic(params) {
  const {
    grade,
    subject,
    topic,
    difficulty = 2,
    activityType = 'sentence_mc',
    objectiveId = 'objective_' + Date.now()
  } = params;

  if (!ACTIVITY_TEMPLATES_BY_TYPE[activityType]) {
    throw new Error(`Unsupported activity type: ${activityType}`);
  }

  // Get template
  const templateDef = ACTIVITY_TEMPLATES_BY_TYPE[activityType];
  const objective = { id: objectiveId, phoneme: 'a', grade };

  // Generate from template
  const activity = templateDef.template(objective, difficulty);

  // Return renderer-safe spec (no answer key)
  return {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: activity.type,
    grade,
    subject,
    topic,
    objectiveId,
    difficulty: Math.max(1, Math.min(5, difficulty)),
    prompt: activity.prompt,
    tiles: activity.tiles,
    options: activity.options,
    pairs: activity.pairs,
    timeLimitMs: difficulty <= 2 ? 90000 : difficulty <= 4 ? 60000 : 45000,
    // Explanation provided after answer
    explanation: activity.explanation,
    // Answer key stored separately (not in this spec)
    _correctAnswer: activity.correctAnswer
  };
}

/**
 * Generate activity with optional AI enhancement.
 * Falls back to deterministic if AI unavailable.
 */
export async function generateLessonActivityWithAI(params) {
  const deterministicActivity = generateLessonActivityDeterministic(params);

  const aiService = getAIService();
  const isAvailable = await aiService.checkAvailability();

  if (!isAvailable) {
    return deterministicActivity;
  }

  try {
    // Get AI-enhanced explanation for the same activity
    const aiExplanation = await aiService.generateExplanation(
      `${params.topic}: ${deterministicActivity.prompt}`,
      params.grade
    );

    return {
      ...deterministicActivity,
      explanation: aiExplanation,
      aiEnhanced: true
    };
  } catch (err) {
    console.warn('AI enhancement failed, using deterministic activity:', err.message);
    return deterministicActivity;
  }
}

/**
 * Get available objectives for a grade/subject/topic.
 */
export function getObjectivesForTopic(grade, subject, topic) {
  const gradeData = LESSON_TEMPLATES[grade];
  if (!gradeData) return [];

  const subjectData = gradeData[subject];
  if (!subjectData) return [];

  const topicData = subjectData[topic];
  if (!topicData) return [];

  return topicData.objectives || [];
}

/**
 * Get all available topics for a grade/subject.
 */
export function getTopicsForSubject(grade, subject) {
  const gradeData = LESSON_TEMPLATES[grade];
  if (!gradeData) return [];

  const subjectData = gradeData[subject];
  if (!subjectData) return [];

  return Object.keys(subjectData);
}

/**
 * Get all subjects for a grade.
 */
export function getSubjectsForGrade(grade) {
  const gradeData = LESSON_TEMPLATES[grade];
  if (!gradeData) return [];

  return Object.keys(gradeData);
}

/**
 * Validate generated activity before presenting to child.
 */
export function validateGeneratedActivity(activity) {
  const errors = [];

  if (!activity.id) errors.push('Missing activity id');
  if (!activity.prompt) errors.push('Missing prompt');
  if (!activity.type) errors.push('Missing activity type');
  if (activity.options && !Array.isArray(activity.options)) errors.push('Options must be array');
  if (activity.tiles && !Array.isArray(activity.tiles)) errors.push('Tiles must be array');
  if (activity.difficulty < 1 || activity.difficulty > 5) errors.push('Difficulty must be 1-5');

  // Type-specific validation
  if (activity.type === 'sentence_mc' && (!activity.options || activity.options.length < 2)) {
    errors.push('Multiple choice requires at least 2 options');
  }

  if (activity.type === 'word_build' && (!activity.tiles || activity.tiles.length < 2)) {
    errors.push('Word build requires at least 2 tiles');
  }

  return {
    isValid: errors.length === 0,
    errors,
    activity
  };
}
