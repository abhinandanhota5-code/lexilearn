/**
 * Screen P3: Document Upload & AI Report Extraction
 * Allows parents to select a digital PDF or text report and run local Llama extraction.
 */

export function renderDocumentUploadScreen(container, { profile, onExtractionComplete, onSkip, onBack }) {
  let selectedFilePath = null;
  let selectedFileName = null;

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Document Ingestion • Optional Support</span>
        <h1 class="parent-title">Upload an Assessment or Report 📄</h1>
        <p class="parent-subtitle">
          Have an IEP, speech evaluation, or school specialist report for ${profile?.name || 'your child'}? Local AI will extract documented accommodations for your review.
        </p>
      </div>

      <div class="parent-card">
        <div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border); margin-bottom: var(--space-lg);">
          <span style="font-size: 28px;">🛡️</span>
          <div>
            <strong>100% Offline & Private:</strong> The report is parsed entirely on your device using local Llama 3.1 8B. It is never uploaded to the internet or shared with third parties.
          </div>
        </div>

        <div id="upload-dropzone" class="disclaimer-box" style="flex-direction: column; align-items: center; justify-content: center; padding: var(--space-xl); border: 2px dashed var(--color-border); text-align: center; cursor: pointer; transition: var(--transition-gentle);">
          <span style="font-size: 48px; margin-bottom: var(--space-xs);">📑</span>
          <h3 style="margin: 0 0 6px 0; font-size: var(--font-size-base); color: var(--color-text-primary);">
            Choose an Evaluation Document
          </h3>
          <p class="form-hint" style="margin: 0 0 var(--space-md) 0;">
            Supports digital PDF (.pdf) and plain text (.txt, .md) documents
          </p>
          <button type="button" class="btn-secondary" id="browse-file-btn">
            Browse Files on Computer...
          </button>
        </div>

        <div id="selected-file-card" style="display: none; margin-top: var(--space-md); padding: var(--space-md); background-color: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span style="font-size: 32px;">📄</span>
            <div>
              <div id="file-card-name" style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary);"></div>
              <div class="form-hint" style="margin: 0;">Ready for local AI analysis</div>
            </div>
          </div>
          <button type="button" class="btn-secondary" id="clear-file-btn" style="min-height: 40px; padding: 0 var(--space-sm); font-size: var(--font-size-xs);">
            ✕ Remove
          </button>
        </div>

        <div id="extraction-status" style="display: none; margin-top: var(--space-lg); text-align: center;">
          <div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-accent); justify-content: center; gap: var(--space-sm);">
            <span style="font-size: 24px; animation: spin 1s infinite linear;">⚙️</span>
            <div>
              <strong>Analyzing with local Llama 3.1 8B...</strong>
              <div class="form-hint" style="margin-top: 4px;">Extracting documented strengths, challenges, and accommodations...</div>
            </div>
          </div>
        </div>

        <div id="upload-error" class="alert-banner error" style="display: none; margin-top: var(--space-md);"></div>

        <div class="button-row" style="justify-content: space-between; margin-top: var(--space-xl);">
          <div>
            ${onBack ? `<button type="button" class="btn-secondary" id="upload-back-btn">⬅ Back</button>` : ''}
          </div>
          
          <div style="display: flex; gap: var(--space-sm);">
            <button type="button" class="btn-secondary" id="skip-upload-btn">
              Skip for Now
            </button>
            <button type="button" class="btn-primary" id="analyze-doc-btn" disabled>
              Analyze with Local AI ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const dropzone = container.querySelector('#upload-dropzone');
  const browseBtn = container.querySelector('#browse-file-btn');
  const selectedFileCard = container.querySelector('#selected-file-card');
  const fileCardName = container.querySelector('#file-card-name');
  const clearFileBtn = container.querySelector('#clear-file-btn');
  const analyzeBtn = container.querySelector('#analyze-doc-btn');
  const statusBox = container.querySelector('#extraction-status');
  const errorBox = container.querySelector('#upload-error');
  const skipBtn = container.querySelector('#skip-upload-btn');
  const backBtn = container.querySelector('#upload-back-btn');

  // File selection trigger
  async function chooseFile() {
    errorBox.style.display = 'none';
    try {
      const res = await window.electronAPI.openDocumentDialog();
      if (res.canceled || !res.filePath) return;

      selectedFilePath = res.filePath;
      selectedFileName = res.fileName;

      fileCardName.textContent = selectedFileName;
      selectedFileCard.style.display = 'flex';
      analyzeBtn.disabled = false;
    } catch (err) {
      errorBox.textContent = `⚠️ Error opening file dialog: ${err.message}`;
      errorBox.style.display = 'flex';
    }
  }

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chooseFile();
  });
  dropzone.addEventListener('click', chooseFile);

  clearFileBtn.addEventListener('click', () => {
    selectedFilePath = null;
    selectedFileName = null;
    selectedFileCard.style.display = 'none';
    analyzeBtn.disabled = true;
    errorBox.style.display = 'none';
  });

  // Skip step
  skipBtn.addEventListener('click', onSkip);

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', onBack);
  }

  // Analyze trigger
  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFilePath) return;

    errorBox.style.display = 'none';
    statusBox.style.display = 'block';
    analyzeBtn.disabled = true;
    browseBtn.disabled = true;
    skipBtn.disabled = true;

    try {
      const result = await window.electronAPI.extractDocument(selectedFilePath);

      if (!result.success) {
        statusBox.style.display = 'none';
        analyzeBtn.disabled = false;
        browseBtn.disabled = false;
        skipBtn.disabled = false;
        errorBox.textContent = `⚠️ Ingestion Error: ${result.error}`;
        errorBox.style.display = 'flex';
        return;
      }

      // Transition to Screen P4 (Review & Confirm)
      onExtractionComplete({
        extraction: result.extraction,
        fileMeta: result.fileMeta
      });
    } catch (err) {
      statusBox.style.display = 'none';
      analyzeBtn.disabled = false;
      browseBtn.disabled = false;
      skipBtn.disabled = false;
      errorBox.textContent = `⚠️ Unexpected error: ${err.message}`;
      errorBox.style.display = 'flex';
    }
  });
}
