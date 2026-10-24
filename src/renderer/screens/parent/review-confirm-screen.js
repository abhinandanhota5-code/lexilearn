/**
 * Screen P4: Review & Confirm Extracted Observations
 * Parent verifies, toggles, or modifies AI-extracted accommodations before persisting.
 */

export function renderReviewConfirmScreen(container, { profile, extractionData, fileMeta, onConfirmed, onBack }) {
  const extraction = extractionData || {};
  const strengths = extraction.extractedStrengths || [];
  const challenges = extraction.extractedChallenges || [];
  const accommodations = extraction.recommendedAccommodations || [];
  const unmentioned = extraction.unmentionedAreas || [];

  const strengthsList = strengths.length > 0
    ? strengths.map(s => `<li style="margin-bottom: 6px;">💪 <strong>${s}</strong></li>`).join('')
    : '<li><em>None explicitly documented in this section.</em></li>';

  const challengesList = challenges.length > 0
    ? challenges.map(c => `<li style="margin-bottom: 6px;">🎯 <strong>${c}</strong></li>`).join('')
    : '<li><em>None explicitly documented in this section.</em></li>';

  const accommodationCards = accommodations.length > 0
    ? accommodations.map((acc, i) => `
        <div class="disclaimer-box" style="margin-bottom: var(--space-sm); align-items: flex-start; justify-content: space-between; background-color: var(--color-bg-primary);">
          <div style="flex: 1; margin-right: var(--space-md);">
            <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary); margin-bottom: 4px;">
              ${acc.label}
            </div>
            <div class="form-hint" style="margin: 0 0 6px 0; font-style: italic;">
              "${acc.sourceQuoteOrExcerpt}"
            </div>
            <span class="parent-badge" style="font-size: 11px; padding: 2px 8px; margin: 0;">
              Source Category: ${acc.category || 'Reading Support'}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input 
              type="checkbox" 
              class="disclaimer-checkbox acc-toggle" 
              id="acc-toggle-${i}" 
              data-acc-id="${acc.id}"
              ${acc.recommendedDefault ? 'checked' : ''}
            />
            <label for="acc-toggle-${i}" style="font-size: var(--font-size-xs); font-weight: 600; cursor: pointer;">
              Apply
            </label>
          </div>
        </div>
      `).join('')
    : '<p><em>No specific accommodations were identified in this document. Standard assistive defaults will be used.</em></p>';

  const unmentionedList = unmentioned.length > 0
    ? unmentioned.map(u => `<li>ℹ️ ${u}</li>`).join('')
    : '<li>All core support areas were noted in the report.</li>';

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Step 2 of 2 • Parent Review & Confirmation</span>
        <h1 class="parent-title">Review Documented Supports 📋</h1>
        <p class="parent-subtitle">
          Local AI extracted the following observations from <strong>${fileMeta?.fileName || 'your document'}</strong>. Please confirm what you would like to apply for ${profile?.name || 'your child'}.
        </p>
      </div>

      <div class="parent-card">
        <div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border); margin-bottom: var(--space-lg);">
          <span style="font-size: 24px;">⚖️</span>
          <div>
            <strong>Educational Accommodations Only:</strong> These extracted notes are functional learning supports. They do not constitute a medical diagnosis and do not replace professional consultations.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-lg);">
          <div class="info-tile" style="padding: var(--space-md);">
            <div class="info-tile-label" style="color: var(--color-success);">Documented Strengths</div>
            <ul style="margin: var(--space-xs) 0 0 0; padding-left: 20px; font-size: var(--font-size-sm); color: var(--color-text-primary);">
              ${strengthsList}
            </ul>
          </div>

          <div class="info-tile" style="padding: var(--space-md);">
            <div class="info-tile-label" style="color: var(--color-accent);">Documented Focus Areas</div>
            <ul style="margin: var(--space-xs) 0 0 0; padding-left: 20px; font-size: var(--font-size-sm); color: var(--color-text-primary);">
              ${challengesList}
            </ul>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Extracted Accommodations</label>
          <span class="form-hint">Toggle on or off before confirming:</span>
          <div id="accommodations-container">
            ${accommodationCards}
          </div>
        </div>

        <div class="form-group" style="margin-top: var(--space-lg);">
          <label class="form-label">Unmentioned / Missing Areas in Report</label>
          <span class="form-hint">These areas were not explicitly addressed in the document and will use default settings:</span>
          <div class="info-tile" style="background-color: var(--color-bg-card); padding: var(--space-sm);">
            <ul style="margin: 0; padding-left: 20px; font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.6;">
              ${unmentionedList}
            </ul>
          </div>
        </div>

        <div class="form-group" style="margin-top: var(--space-lg);">
          <label class="form-label" for="parent-custom-notes">Parent / Educator Notes (Optional)</label>
          <span class="form-hint">Add any personal tips, teacher observations, or specific goals for ${profile?.name || 'the learner'}:</span>
          <textarea 
            id="parent-custom-notes" 
            class="form-input" 
            rows="3" 
            placeholder="e.g. Prefers reading with reading ruler line focus; loves animal stories."
            style="min-height: 80px; resize: vertical;"
          ></textarea>
        </div>

        <div id="confirm-error" class="alert-banner error" style="display: none; margin-top: var(--space-md);"></div>

        <div class="button-row" style="justify-content: space-between; margin-top: var(--space-xl);">
          <button type="button" class="btn-secondary" id="review-back-btn">
            ⬅ Choose Different File
          </button>
          
          <button type="button" class="btn-primary" id="confirm-save-btn">
            Confirm & Save to Profile ✨
          </button>
        </div>
      </div>
    </div>
  `;

  const backBtn = container.querySelector('#review-back-btn');
  const confirmBtn = container.querySelector('#confirm-save-btn');
  const notesInput = container.querySelector('#parent-custom-notes');
  const errorBox = container.querySelector('#confirm-error');

  backBtn.addEventListener('click', onBack);

  confirmBtn.addEventListener('click', async () => {
    errorBox.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Saving Accommodations...';

    // Gather checked accommodations
    const confirmedList = [];
    const appliedSettings = {};

    container.querySelectorAll('.acc-toggle').forEach((checkbox, idx) => {
      if (checkbox.checked) {
        const item = accommodations[idx];
        if (item) {
          confirmedList.push(item);
          // Apply matching accommodation flags if mapped
          if (item.id === 'readingRuler' || item.label.toLowerCase().includes('ruler')) {
            appliedSettings.readingRulerEnabled = true;
          }
          if (item.id === 'syllableColoring' || item.label.toLowerCase().includes('syllable')) {
            appliedSettings.syllableColoringEnabled = true;
          }
          if (item.id === 'wideSpacing' || item.label.toLowerCase().includes('spacing')) {
            appliedSettings.letterSpacingEm = 0.18;
          }
          if (item.id === 'largerFont' || item.label.toLowerCase().includes('font')) {
            appliedSettings.fontSizePx = 26;
          }
        }
      }
    });

    try {
      const result = await window.electronAPI.confirmDocumentAccommodations({
        filePath: fileMeta.filePath,
        confirmedAccommodations: confirmedList,
        parentNotes: notesInput.value.trim(),
        appliedSettings
      });

      if (!result.success) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm & Save to Profile ✨';
        errorBox.textContent = `⚠️ Error saving accommodations: ${result.error}`;
        errorBox.style.display = 'flex';
        return;
      }

      onConfirmed(result.profile);
    } catch (err) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm & Save to Profile ✨';
      errorBox.textContent = `⚠️ Unexpected error: ${err.message}`;
      errorBox.style.display = 'flex';
    }
  });
}
