/**
 * Parent Curriculum Selection (Phase 6 Step 1).
 *
 * Parent picks the school system, the board-specific grade, and the subject
 * their child is learning. Options come from the curriculum registry via IPC
 * (never hardcoded syllabi), and the grade list stays tied to the selected
 * curriculum — the renderer cannot pick a grade that belongs to another
 * system, and the main process re-validates on every write.
 */

export function renderCurriculumSelectionScreen(container, { profile, onContinue, onBack }) {
  let curricula = [];
  let curriculumId = '';
  let gradeId = '';
  let subject = '';
  let busy = false;
  let notice = '';

  const gradeLabel = (g) => (g.canonicalGrade && g.canonicalGrade !== g.label ? `${g.label} (${g.canonicalGrade})` : g.label);

  function currentCurriculum() {
    return curricula.find((c) => c.curriculumId === curriculumId) || null;
  }

  function setContextDefaults() {
    const curriculum = currentCurriculum();
    if (!curriculum) return;

    // Auto-match curriculum grade to profile's canonical grade (no duplicate asking)
    if (!gradeId && profile?.grade) {
      const matchedGrade = curriculum.gradeLevels.find((g) => g.canonicalGrade === profile.grade);
      if (matchedGrade) {
        gradeId = matchedGrade.gradeId;
      } else {
        gradeId = curriculum.gradeLevels[0]?.gradeId || '';
      }
    } else if (!curriculum.gradeLevels.some((g) => g.gradeId === gradeId)) {
      gradeId = curriculum.gradeLevels[0]?.gradeId || '';
    }

    if (!curriculum.subjects.includes(subject)) {
      subject = curriculum.subjects[0] || '';
    }
  }

  function render() {
    const curriculum = currentCurriculum();
    const grades = curriculum ? curriculum.gradeLevels : [];
    const subjects = curriculum ? curriculum.subjects : [];
    const canContinue = Boolean(curriculumId && gradeId && subject) && !busy;

    container.innerHTML = `
      <div class="parent-container">
        <div class="parent-header">
          <span class="parent-badge">School Curriculum</span>
          <h1 class="parent-title">What is ${profile?.name ? profile.name : 'your child'} learning right now?</h1>
          <p class="parent-subtitle">
            Choose the school system and topic area. This makes lessons match the exact
            syllabus — you can change it anytime from the profile page.
          </p>
        </div>

        <div class="parent-card">
          <div class="form-group">
            <label class="form-label" for="curriculum-system">School System</label>
            <select id="curriculum-system" class="form-select">
              ${curricula
                .map(
                  (c) =>
                    `<option value="${esc(c.curriculumId)}" ${c.curriculumId === curriculumId ? 'selected' : ''}>${esc(c.name)}${c.board ? ` (${esc(c.board)})` : ''}</option>`
                )
                .join('')}
            </select>
            <p class="form-hint">A school system is required to match syllabus objectives and lessons.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="curriculum-grade">Grade or Year</label>
            <select id="curriculum-grade" class="form-select" ${grades.length ? '' : 'disabled'}>
              ${grades
                .map(
                  (g) =>
                    `<option value="${esc(g.gradeId)}" ${g.gradeId === gradeId ? 'selected' : ''}>${esc(gradeLabel(g))}</option>`
                )
                .join('')}
            </select>
            <p class="form-hint">Grades are tied to the selected system.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="curriculum-subject">Subject</label>
            <select id="curriculum-subject" class="form-select" ${subjects.length ? '' : 'disabled'}>
              ${subjects
                .map((s) => `<option value="${esc(s)}" ${s === subject ? 'selected' : ''}>${esc(s)}</option>`)
                .join('')}
            </select>
            <p class="form-hint">Subjects are those this system declares.</p>
          </div>

          ${notice ? `<div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border);">${notice}</div>` : ''}

          <div class="button-row" style="justify-content: space-between; margin-top: var(--space-xl);">
            <button type="button" class="btn-secondary" id="curriculum-back-btn">‹ Back</button>
            <button type="button" class="btn-primary" id="curriculum-continue-btn" ${canContinue ? '' : 'disabled'}>
              ${busy ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#curriculum-system').addEventListener('change', (e) => {
      curriculumId = e.target.value;
      gradeId = '';
      subject = '';
      setContextDefaults();
      render();
    });
    container.querySelector('#curriculum-grade').addEventListener('change', (e) => {
      gradeId = e.target.value;
      render();
    });
    container.querySelector('#curriculum-subject').addEventListener('change', (e) => {
      subject = e.target.value;
      render();
    });
    container.querySelector('#curriculum-back-btn').addEventListener('click', () => {
      if (onBack) onBack();
    });
    container.querySelector('#curriculum-continue-btn').addEventListener('click', () => {
      if (busy || !canContinue) return;
      busy = true;
      render();
      const curriculum = currentCurriculum();
      if (!onContinue) return;
      onContinue({
        curriculumId,
        board: curriculum.board,
        curriculumName: curriculum.name,
        grade: curriculum.gradeLevels.find((g) => g.gradeId === gradeId),
        subject
      });
    });
  }

  async function init() {
    container.innerHTML = `
      <div class="parent-container">
        <div class="parent-header">
          <span class="parent-badge">School Curriculum</span>
          <h1 class="parent-title">Setting up…</h1>
        </div>
        <div class="parent-card"><p class="form-hint" style="margin:0;">Loading school systems…</p></div>
      </div>
    `;
    try {
      const res = await window.electronAPI.getCurriculumOptions();
      if (!res || typeof res !== 'object') {
        notice = 'Could not load school systems. Please try again.';
        curricula = [];
        render();
        return;
      }
      if (!res.success || !Array.isArray(res.curricula)) {
        notice = res?.error || 'Could not load school systems. Please try again.';
        curricula = [];
        render();
        return;
      }
      curricula = res.curricula;
      if (curricula.length === 0) {
        notice = 'No school systems are registered yet.';
        render();
        return;
      }
      curriculumId = curricula[0].curriculumId;
      setContextDefaults();
      render();
    } catch (err) {
      notice = err?.message || 'Could not load school systems.';
      curricula = [];
      render();
    }
  }

  init();
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}