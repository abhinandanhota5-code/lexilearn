/**
 * Parent Schoolwork Creation (Phase 7.2).
 *
 * Turns a VERIFIED school material into an explicit schoolwork assignment —
 * the only path by which a child sees a school task on My Day. Nothing here
 * is auto-derived: the assignment type is chosen from a small fixed set, and
 * the due date / teacher reference / instructions / linked objectives are
 * persisted ONLY when the parent supplies them (unknown stays unknown).
 *
 * Lifecycle: the record starts `draft` (inert — invisible to the child) and
 * becomes active only after the parent verifies it on this screen.
 *
 * All data flows through the validated IPC bridge; the renderer never writes
 * straight to disk.
 */

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'classwork', label: 'Classwork' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'reading', label: 'Reading' },
  { value: 'practice', label: 'Practice' }
];

export function renderSchoolworkCreateScreen(container, {
  profile,
  material,
  flow,
  existing,
  onCompleted,
  onBack
}) {
  const learnerId = profile?.learnerId;
  let type = existing?.assignmentType || 'homework';
  let dueDate = existing?.dueDate ? existing.dueDate.slice(0, 10) : '';
  let teacherRef = existing?.teacherRef || '';
  let instructions = existing?.instructions || '';
  let selectedObjectiveIds = new Set(existing?.linkedObjectives || material?.linkedObjectives || []);
  let notice = '';
  let noticeTone = 'ok';
  let created = existing || null; // canonical (draft or verified) record
  let busy = false;

  const curriculumLine = [
    flow?.curriculumName || flow?.curriculumId || material?.curriculumId || '',
    material?.grade || flow?.grade?.label || '',
    material?.subject || ''
  ].filter(Boolean).join(' • ');

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function objectiveCheckbox(id, description, subject, selected) {
    return `
      <label class="objective-toggle" style="display:flex; gap: var(--space-sm); align-items:flex-start; padding: var(--space-xs) 0; cursor:pointer;">
        <input type="checkbox" value="${esc(id)}" ${selected ? 'checked' : ''} style="margin-top:3px;">
        <span>
          <span style="display:block; font-weight:600;">${esc(description)}</span>
          <span class="form-hint" style="margin:0;">${esc(subject || '')}</span>
        </span>
      </label>
    `;
  }

  function objectivesHtml() {
    const objectives = Array.isArray(material?.objectives) ? material.objectives : [];
    if (objectives.length === 0) {
      return `<p class="form-hint" style="margin:0;">No linked objectives on this material — the child will read it instead.</p>`;
    }
    return `<div class="material-objective-list">${objectives.map((o) => objectiveCheckbox(o.objectiveId, o.description, o.subject, selectedObjectiveIds.has(o.objectiveId))).join('')}</div>`;
  }

  function render() {
    const statusBadge = created
      ? created.status === 'verified'
        ? '<span class="badge badge-success">✓ Verified — visible on My Day</span>'
        : '<span class="badge badge-warning">⏳ Draft — invisible to your child</span>'
      : '';

    container.innerHTML = `
      <div class="parent-container">
        <div class="parent-header">
          <span class="parent-badge">Schoolwork</span>
          <h1 class="parent-title">Add as Schoolwork</h1>
          <p class="parent-subtitle">
            Turn a verified material into a real assignment for ${esc(profile?.name || 'your child')}.
            ${curriculumLine ? `Preview: ${esc(curriculumLine)}` : ''}
          </p>
        </div>

        <div class="parent-card">
          <div class="form-group">
            <label class="form-label" style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary);">Based on</label>
            <div class="info-tile" style="padding: var(--space-md); background-color: var(--color-bg-muted, #f4f6f8);">
              <div style="font-weight:700; color:var(--color-text-primary);">${esc(material?.title || 'School material')}</div>
              <div class="form-hint" style="margin:0;">${esc(material?.type || '')} • ${esc(material?.subject || '')}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="schoolwork-type">What kind of assignment is this?</label>
            <select id="schoolwork-type" class="form-select" ${created || busy ? 'disabled' : ''}>
              ${ASSIGNMENT_TYPES.map((t) => `<option value="${t.value}" ${t.value === type ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="schoolwork-due">Due date <span class="form-hint" style="margin:0;">(optional — leave empty if you don't know)</span></label>
            <input type="date" id="schoolwork-due" class="form-input" value="${esc(dueDate)}" ${created || busy ? 'disabled' : ''}>
          </div>

          <div class="form-group">
            <label class="form-label" for="schoolwork-teacher">Teacher or class <span class="form-hint" style="margin:0;">(optional)</span></label>
            <input type="text" id="schoolwork-teacher" class="form-input" placeholder="e.g. Ms Rao, Class 3B" value="${esc(teacherRef)}" maxlength="120" ${created || busy ? 'disabled' : ''}>
          </div>

          <div class="form-group">
            <label class="form-label" for="schoolwork-instructions">Instructions <span class="form-hint" style="margin:0;">(optional — what your child should do)</span></label>
            <textarea id="schoolwork-instructions" class="form-input" rows="3" maxlength="600" ${created || busy ? 'disabled' : ''}>${esc(instructions)}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Learning objectives <span class="form-hint" style="margin:0;">(optional — only the ones you know apply)</span></label>
            ${objectivesHtml()}
          </div>

          ${notice ? `<div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid ${noticeTone === 'err' ? 'var(--color-danger, #b3261e)' : 'var(--color-border)'};">${esc(notice)}</div>` : ''}

          <div class="button-row" style="justify-content: space-between; gap: var(--space-sm); margin-top: var(--space-sm);">
            <button type="button" class="btn-secondary" id="schoolwork-cancel-btn">‹ Back</button>
            <div style="display:flex; gap: var(--space-sm);">
              ${
                created
                  ? created.status === 'verified'
                    ? `<button type="button" class="btn-primary" id="schoolwork-done-btn">Done</button>`
                    : `<button type="button" class="btn-primary" id="schoolwork-verify-btn" ${busy ? 'disabled' : ''}>✓ Verify Schoolwork</button>`
                  : `<button type="button" class="btn-primary" id="schoolwork-save-btn" ${busy ? 'disabled' : ''}>Save as Schoolwork</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#schoolwork-cancel-btn').addEventListener('click', () => onBack && onBack());

    const typeEl = container.querySelector('#schoolwork-type');
    if (typeEl) typeEl.addEventListener('change', (e) => { type = e.target.value; });

    const dueEl = container.querySelector('#schoolwork-due');
    if (dueEl) dueEl.addEventListener('change', (e) => { dueDate = e.target.value; });

    const teacherEl = container.querySelector('#schoolwork-teacher');
    if (teacherEl) teacherEl.addEventListener('input', (e) => { teacherRef = e.target.value; });

    const instructionsEl = container.querySelector('#schoolwork-instructions');
    if (instructionsEl) instructionsEl.addEventListener('input', (e) => { instructions = e.target.value; });

    container.querySelectorAll('.objective-toggle input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedObjectiveIds.add(checkbox.value);
        else selectedObjectiveIds.delete(checkbox.value);
      });
    });

    const saveBtn = container.querySelector('#schoolwork-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', onSave);

    const verifyBtn = container.querySelector('#schoolwork-verify-btn');
    if (verifyBtn) verifyBtn.addEventListener('click', onVerify);

    const doneBtn = container.querySelector('#schoolwork-done-btn');
    if (doneBtn) doneBtn.addEventListener('click', () => onCompleted && onCompleted(created));
  }

  async function onSave() {
    if (busy) return;
    busy = true;
    notice = '';
    render();
    try {
      const res = await window.electronAPI.addSchoolwork({
        learnerId,
        materialId: material.materialId,
        assignmentType: type,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
        teacherRef: teacherRef.trim() || null,
        instructions: instructions.trim() || null,
        linkedObjectives: [...selectedObjectiveIds]
      });
      if (!res?.success) {
        notice = res?.error || 'Could not save this schoolwork.';
        noticeTone = 'err';
        busy = false;
        render();
        return;
      }
      created = res.record;
      notice = res.existing
        ? 'A schoolwork record already exists for this material.'
        : 'Saved as a draft. It is invisible to your child until you verify it.';
      noticeTone = 'ok';
      busy = false;
      render();
    } catch (err) {
      notice = err?.message || 'Could not save this schoolwork.';
      noticeTone = 'err';
      busy = false;
      render();
    }
  }

  async function onVerify() {
    if (busy || !created) return;
    busy = true;
    render();
    try {
      const res = await window.electronAPI.verifySchoolwork({
        learnerId,
        schoolworkId: created.schoolworkId,
        verified: true
      });
      if (!res?.success) {
        notice = res?.error || 'Could not verify this schoolwork.';
        noticeTone = 'err';
        busy = false;
        render();
        return;
      }
      created = res.record;
      notice = `"${res.record.title}" is now on your child's My Day.`;
      noticeTone = 'ok';
      busy = false;
      render();
    } catch (err) {
      notice = err?.message || 'Could not verify this schoolwork.';
      noticeTone = 'err';
      busy = false;
      render();
    }
  }

  render();
}