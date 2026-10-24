/**
 * Parent School Materials (Phase 6 Step 1).
 *
 * Parent adds the child's actual learning source (worksheet, textbook chapter,
 * class notes, ...), links it to curriculum learning objectives, and VERIFIES
 * it. Only verified materials become trusted grounding context — everything
 * starts `unverified` and stays inert until the parent confirms it.
 *
 * All data flows through the validated IPC bridge; the renderer never writes
 * straight to disk.
 */

import { MAX_EXTRACTED_CONTENT_CHARS } from '../../../services/curriculum/curriculum-schema.js';

const MATERIAL_TYPE_LABELS = {
  textbook_chapter: 'Textbook Chapter',
  worksheet: 'Worksheet',
  class_notes: 'Class Notes',
  assignment: 'Assignment',
  syllabus_document: 'Syllabus Document'
};

export function renderSchoolMaterialScreen(container, { profile, flow, onDone, onBack, onAddSchoolwork }) {
  const learnerId = profile?.learnerId;
  const objectives = [];
  let materials = [];
  let selectedObjectiveIds = new Set();
  let pending = null; // { filePath, fileName, charCount, text }
  let addTitle = '';
  let addType = 'worksheet';
  let adding = false;
  let notice = '';
  let listError = '';
  let linkingFor = null; // materialId currently in link-edit mode
  let linkSelection = new Set();

  const curriculum = flow?.curriculum || null;
  const grade = flow?.grade || null;
  const headerLine = [
    flow?.curriculumName || flow?.curriculumId || '',
    grade ? grade.label : grade?.gradeId || '',
    flow?.subject || ''
  ].filter(Boolean).join(' • ');

  async function refreshObjectives() {
    const res = await window.electronAPI.getCurriculumObjectives({
      curriculumId: flow.curriculumId,
      grade: flow.grade?.gradeId,
      subject: flow.subject
    });
    objectives.length = 0;
    if (res?.success && Array.isArray(res.objectives)) {
      objectives.push(...res.objectives);
    }
    // Prune any selections that no longer resolve.
    const known = new Set(objectives.map((o) => o.objectiveId));
    for (const id of [...selectedObjectiveIds]) if (!known.has(id)) selectedObjectiveIds.delete(id);
    for (const id of [...linkSelection]) if (!known.has(id)) linkSelection.delete(id);
  }

  async function refreshMaterials() {
    listError = '';
    const res = await window.electronAPI.listSchoolMaterials(learnerId);
    if (!res?.success) {
      listError = res?.error || 'Could not load school materials.';
      materials = [];
      render();
      return;
    }
    materials = res.materials || [];
    if (linkingFor && !materials.some((m) => m.materialId === linkingFor)) linkingFor = null;
    render();
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const statusBadge = (status) => {
    if (status === 'verified') return '<span class="badge badge-success">✓ Verified</span>';
    if (status === 'rejected') return '<span class="badge badge-danger">✗ Rejected</span>';
    return '<span class="badge badge-warning">⏳ Unverified</span>';
  };

  function objectiveCheckbox(id, description, subject, selected) {
    return `
      <label class="objective-toggle" style="display:flex; gap: var(--space-sm); align-items:flex-start; padding: var(--space-xs) 0; cursor:pointer;">
        <input type="checkbox" value="${esc(id)}" ${selected ? 'checked' : ''} style="margin-top:3px;">
        <span>
          <span style="display:block; font-weight:600;">${esc(description)}</span>
          <span class="form-hint" style="margin:0;">${esc(subject || '')} • ${esc(id)}</span>
        </span>
      </label>
    `;
  }

  function render() {
    const verifiedCount = materials.filter((m) => m.verificationStatus === 'verified').length;
    container.innerHTML = `
      <div class="parent-container">
        <div class="parent-header">
          <span class="parent-badge">School Materials</span>
          <h1 class="parent-title">Add what ${profile?.name ? profile.name : 'your child'} is learning from</h1>
          <p class="parent-subtitle">
            Materials added here must be verified by you before they become trusted
            learning context. Preview: ${esc(headerLine || 'no curriculum selected')}
          </p>
        </div>

        <div class="parent-card">
          <div class="form-group">
            <label class="form-label" style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary);">
              Add New Material
            </label>

            <div class="button-row" style="flex-wrap: wrap; gap: var(--space-sm);">
              <button type="button" class="btn-secondary" id="material-choose-btn" ${adding ? 'disabled' : ''}>
                📄 ${pending ? 'Choose a different file' : 'Choose a file'}
              </button>
              ${
                pending
                  ? `<span class="form-hint" style="margin:0; align-self:center;">
                      ${esc(pending.fileName)} — ${pending.charCount.toLocaleString()} characters extracted
                    </span>`
                  : ''
              }
            </div>
            ${pending ? `<p class="form-hint" style="margin-top: var(--space-xs);">Preview: “${esc(pending.previewExcerpt)}”</p>` : ''}
            ${
              pending && pending.charCount > MAX_EXTRACTED_CONTENT_CHARS
                ? `<p class="form-hint" style="color: var(--color-danger, #b3261e); margin-top: var(--space-xs);">
                    This file is larger than ${MAX_EXTRACTED_CONTENT_CHARS.toLocaleString()} characters and would be rejected by the
                    system. Please split it into smaller parts.
                  </p>`
                : ''
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="material-type">Material Type</label>
            <select id="material-type" class="form-select" ${adding ? 'disabled' : ''}>
              ${Object.entries(MATERIAL_TYPE_LABELS)
                .map(([value, label]) => `<option value="${value}" ${value === addType ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="material-title">Title</label>
            <input type="text" id="material-title" class="form-input" placeholder="e.g. Water Cycle Worksheet" value="${esc(addTitle)}" maxlength="160" ${adding ? 'disabled' : ''}>
          </div>

          <div class="form-group">
            <label class="form-label">
              Link Learning Objectives ${objectives.length ? `(${selectedObjectiveIds.size} selected)` : ''}
            </label>
            ${
              objectives.length === 0
                ? `<p class="form-hint" style="margin:0;">No objectives found for ${esc(headerLine || 'this selection')}. You can still add the material and link objectives later.</p>`
                : `<div class="material-objective-list">${objectives.map((o) => objectiveCheckbox(o.objectiveId, o.description, o.subject, selectedObjectiveIds.has(o.objectiveId))).join('')}</div>`
            }
          </div>

          ${notice ? `<div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border);">${notice}</div>` : ''}

          <div class="button-row" style="justify-content: flex-end; gap: var(--space-sm);">
            <button type="button" class="btn-secondary" id="material-add-btn" ${pending && !adding ? '' : 'disabled'}>
              ${adding ? 'Adding…' : '＋ Add Material'}
            </button>
          </div>
        </div>

        <div class="parent-card" style="margin-top: var(--space-lg);">
          <div class="form-group">
            <label class="form-label" style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary);">
              Materials Added (${materials.length})
            </label>
            ${listError ? `<div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border);">${esc(listError)}</div>` : ''}
            ${
              materials.length === 0
                ? '<p class="form-hint" style="margin:0;">No school materials added yet. Add your first material above.</p>'
                : `
                  <div class="material-list">
                    ${materials
                      .map((m) => {
                        const linkPanel = linkingFor === m.materialId && m.verificationStatus !== 'rejected'
                          ? `
                            <div class="material-link-panel" style="margin-top: var(--space-xs); padding: var(--space-sm); border: 1px solid var(--color-border); border-radius: 12px;">
                              ${objectives.map((o) => objectiveCheckbox(o.objectiveId, o.description, o.subject, linkSelection.has(o.objectiveId))).join('') || '<p class="form-hint" style="margin:0;">No objectives available for this selection.</p>'}
                              <div class="button-row" style="justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xs);">
                                <button type="button" class="btn-secondary" id="material-link-cancel-btn">Cancel</button>
                                <button type="button" class="btn-primary" id="material-link-save-btn">Save Links</button>
                              </div>
                            </div>`
                          : '';
                        return `
                          <div class="info-tile" style="padding: var(--space-md); margin-bottom: var(--space-sm); background-color: var(--color-bg-card);" data-material-id="${esc(m.materialId)}">
                            <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:var(--space-xs);">
                              <div style="flex:1 1 260px;">
                                <div style="font-weight:700; color:var(--color-text-primary);">${esc(m.title)}</div>
                                <div class="form-hint" style="margin:0;">${esc(MATERIAL_TYPE_LABELS[m.type] || m.type || '')} • ${esc(m.curriculumId)} • ${esc(m.grade)} • ${esc(m.subject)}</div>
                                <div class="form-hint" style="margin:0;">Linked objectives: ${m.linkedObjectives?.length || 0}</div>
                              </div>
                              <div style="display:flex; align-items:center; gap: var(--space-sm); flex-wrap:wrap;">
                                ${statusBadge(m.verificationStatus)}
                                ${
                                  m.verificationStatus !== 'rejected'
                                    ? `<button type="button" class="btn-secondary" data-action="link" data-id="${esc(m.materialId)}">🔗 Link</button>`
                                    : ''
                                }
                                ${
                                  m.verificationStatus === 'verified'
                                    ? `<button type="button" class="btn-secondary" data-action="schoolwork" data-id="${esc(m.materialId)}">➕ Schoolwork</button>`
                                    : ''
                                }
                                ${
                                  m.verificationStatus === 'verified'
                                    ? ''
                                    : `<button type="button" class="btn-primary" data-action="verify" data-id="${esc(m.materialId)}">✓ Verify</button>`
                                }
                                ${
                                  m.verificationStatus === 'rejected'
                                    ? `<button type="button" class="btn-primary" data-action="verify" data-id="${esc(m.materialId)}">✓ Verify Again</button>`
                                    : `<button type="button" class="btn-secondary" data-action="reject" data-id="${esc(m.materialId)}">✗ Reject</button>`
                                }
                              </div>
                            </div>
                            ${linkPanel}
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                `
            }
            ${
              materials.length > 0 && verifiedCount === 0
                ? `<p class="form-hint" style="margin-top: var(--space-sm);">⚠️ Nothing is verified yet. Unverified materials are never used as learning context — verify the ones you trust.</p>`
                : ''
            }
          </div>
        </div>

        <div class="button-row" style="justify-content: space-between; margin-top: var(--space-lg);">
          <button type="button" class="btn-secondary" id="material-done-back-btn">‹ Back</button>
          <button type="button" class="btn-primary" id="material-done-btn">Continue →</button>
        </div>
      </div>
    `;

    container.querySelector('#material-choose-btn').addEventListener('click', onChooseFile);
    container.querySelector('#material-type').addEventListener('change', (e) => { addType = e.target.value; });
    container.querySelector('#material-title').addEventListener('input', (e) => { addTitle = e.target.value; });
    container.querySelector('#material-add-btn').addEventListener('click', onAddMaterial);
    container.querySelector('#material-done-btn').addEventListener('click', () => onDone && onDone());
    container.querySelector('#material-done-back-btn').addEventListener('click', () => onBack && onBack());

    const objectiveRoots = container.querySelectorAll('.objective-toggle');
    objectiveRoots.forEach((labelNode) => {
      const checkbox = labelNode.querySelector('input[type="checkbox"]');
      if (!checkbox) return;
      checkbox.addEventListener('change', () => {
        const id = checkbox.value;
        if (linkingFor) {
          if (checkbox.checked) linkSelection.add(id);
          else linkSelection.delete(id);
        } else {
          if (checkbox.checked) selectedObjectiveIds.add(id);
          else selectedObjectiveIds.delete(id);
        }
        render();
      });
    });

    container.querySelectorAll('[data-action="verify"]').forEach((btn) => {
      btn.addEventListener('click', () => onVerify(btn.dataset.id, true));
    });
    container.querySelectorAll('[data-action="reject"]').forEach((btn) => {
      btn.addEventListener('click', () => onVerify(btn.dataset.id, false));
    });
    container.querySelectorAll('[data-action="link"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        linkingFor = btn.dataset.id;
        const material = materials.find((m) => m.materialId === linkingFor);
        linkSelection = new Set(material?.linkedObjectives || []);
        render();
      });
    });
    container.querySelectorAll('[data-action="schoolwork"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (onAddSchoolwork) onAddSchoolwork(btn.dataset.id);
      });
    });
    const linkCancel = container.querySelector('#material-link-cancel-btn');
    if (linkCancel) linkCancel.addEventListener('click', () => { linkingFor = null; render(); });
    const linkSave = container.querySelector('#material-link-save-btn');
    if (linkSave) linkSave.addEventListener('click', () => onSaveLinks());
  }

  async function onChooseFile() {
    try {
      const picked = await window.electronAPI.openDocumentDialog();
      if (!picked || picked.canceled) return;
      const extraction = await window.electronAPI.extractSchoolMaterial(picked.filePath);
      if (!extraction?.success) {
        notice = `Could not extract this file: ${extraction?.error || 'unknown error'}`;
        render();
        return;
      }
      pending = {
        filePath: picked.filePath,
        fileName: extraction.fileName || picked.fileName || 'document',
        charCount: extraction.charCount,
        text: extraction.text,
        previewExcerpt: String(extraction.text || '').replace(/\s+/g, ' ').slice(0, 140)
      };
      if (!addTitle || addTitle === '') {
        addTitle = pending.fileName.replace(/\.[^.]+$/, '').slice(0, 160) || 'School material';
      }
      notice = '';
      render();
    } catch (err) {
      notice = err?.message || 'Could not pick or extract the file.';
      render();
    }
  }

  async function onAddMaterial() {
    if (!pending || adding) return;
    adding = true;
    notice = '';
    render();
    const title = addTitle.trim();
    try {
      const res = await window.electronAPI.addSchoolMaterial({
        learnerId,
        title,
        type: addType,
        curriculumId: flow.curriculumId,
        grade: flow.grade?.gradeId,
        subject: flow.subject,
        source: { reference: pending.fileName },
        extractedContent: pending.text,
        linkedObjectives: [...selectedObjectiveIds]
      });
      if (!res?.success) {
        notice = res?.error || 'Could not add the material.';
        adding = false;
        render();
        return;
      }
      if (res.rejected && res.rejected.length > 0) {
        notice = `Added. Some objectives could not be linked: ${res.rejected.map((r) => r.objectiveId).join(', ')}.`;
      } else {
        notice = 'Material added. Verify it when you are ready — verification is required before it becomes learning context.';
      }
      pending = null;
      addTitle = '';
      selectedObjectiveIds = new Set();
      adding = false;
      await refreshObjectives();
      await refreshMaterials();
    } catch (err) {
      notice = err?.message || 'Could not add the material.';
      adding = false;
      render();
    }
  }

  async function onVerify(materialId, verified) {
    try {
      const res = await window.electronAPI.verifySchoolMaterial({ learnerId, materialId, verified });
      if (!res?.success) {
        notice = res?.error || 'Could not update verification status.';
        render();
        return;
      }
      notice = verified
        ? `"${res.material.title}" is now verified and can be used as learning context.`
        : `"${res.material.title}" was rejected and will not be used.`;
      await refreshMaterials();
    } catch (err) {
      notice = err?.message || 'Could not update verification status.';
      render();
    }
  }

  async function onSaveLinks() {
    if (!linkingFor) return;
    try {
      const res = await window.electronAPI.linkSchoolMaterialObjectives({
        learnerId,
        materialId: linkingFor,
        objectiveIds: [...linkSelection]
      });
      if (!res?.success) {
        notice = res?.error || 'Could not save objective links.';
        render();
        return;
      }
      notice = `Links saved (${res.applied.length} applied)${
        res.rejected && res.rejected.length > 0 ? `; ${res.rejected.map((r) => r.objectiveId).join(', ')} were incompatible and not applied.` : ''
      }`;
      linkingFor = null;
      await refreshMaterials();
    } catch (err) {
      notice = err?.message || 'Could not save objective links.';
      render();
    }
  }

  async function init() {
    await Promise.all([refreshObjectives(), refreshMaterials()]);
  }

  init();
}