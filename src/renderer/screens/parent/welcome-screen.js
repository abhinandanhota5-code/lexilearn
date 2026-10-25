/**
 * Screen P1: Welcome & Parent Gateway
 * Establishes privacy assurance, medical disclaimer agreement, and 4-digit Parent PIN setup.
 */

export function renderWelcomeScreen(container, { onContinue }) {
  container.innerHTML = `
    <!-- BUILD VERIFICATION: Welcome Screen -->
    <div style="position: fixed; top: 12px; right: 12px; background: #FF6B6B; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; z-index: 9999;">🔴 BUILD v2024-10-24</div>
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Step 1 of 2 • Parent Gateway</span>
        <h1 class="parent-title">Welcome to LexiLearn 👋</h1>
        <p class="parent-subtitle">
          A personalized learning companion for children with dyslexia. All your data and activity logs are stored safely on this computer.
        </p>
      </div>

      <div class="parent-card">
        <div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border);">
          <span style="font-size: 28px;">🛡️</span>
          <div>
            <strong>100% Local & Private:</strong> All your data and activity logs are stored safely on this computer. No data is sent to external cloud servers.
          </div>
        </div>

        <form id="welcome-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="disclaimer-checkbox">Medical Disclaimer & Acknowledgment</label>
            <div class="disclaimer-box">
              <input 
                type="checkbox" 
                id="disclaimer-checkbox" 
                class="disclaimer-checkbox"
                required
              />
              <label for="disclaimer-checkbox" class="disclaimer-text">
                I understand that LexiLearn is a personalized learning companion for children with dyslexia. It helps learners with reading and does <strong>not</strong> provide medical or clinical advice.
              </label>
            </div>
            <div id="disclaimer-error" class="field-error" style="display: none;">
              ⚠️ Please confirm you have read and agreed to the disclaimer.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="pin-input">Create Parent PIN</label>
            <span class="form-hint">
              A 4-digit code to protect adult settings and profile adjustments from accidental changes by the learner.
            </span>
            <div style="max-width: 320px;">
              <input 
                type="password" 
                id="pin-input" 
                class="form-input" 
                maxlength="4" 
                pattern="[0-9]{4}" 
                inputmode="numeric" 
                placeholder="4-digit PIN (e.g. 1234)" 
                autocomplete="off"
                required
              />
              <div id="pin-error" class="field-error" style="display: none;"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="pin-confirm-input">Confirm Parent PIN</label>
            <div style="max-width: 320px;">
              <input 
                type="password" 
                id="pin-confirm-input" 
                class="form-input" 
                maxlength="4" 
                pattern="[0-9]{4}" 
                inputmode="numeric" 
                placeholder="Re-enter 4-digit PIN" 
                autocomplete="off"
                required
              />
              <div id="pin-confirm-error" class="field-error" style="display: none;"></div>
            </div>
          </div>

          <div class="button-row">
            <button type="submit" class="btn-primary" id="welcome-submit-btn">
              Set Up Learner Profile ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#welcome-form');
  const disclaimerCheck = container.querySelector('#disclaimer-checkbox');
  const pinInput = container.querySelector('#pin-input');
  const pinConfirmInput = container.querySelector('#pin-confirm-input');

  const disclaimerError = container.querySelector('#disclaimer-error');
  const pinError = container.querySelector('#pin-error');
  const pinConfirmError = container.querySelector('#pin-confirm-error');

  // Input filter to allow only digits
  [pinInput, pinConfirmInput].forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;

    // Reset error display
    disclaimerError.style.display = 'none';
    pinError.style.display = 'none';
    pinConfirmError.style.display = 'none';
    pinInput.classList.remove('has-error');
    pinConfirmInput.classList.remove('has-error');

    // Validate disclaimer
    if (!disclaimerCheck.checked) {
      disclaimerError.style.display = 'flex';
      hasError = true;
    }

    // Validate PIN
    const pin = pinInput.value.trim();
    if (!/^\d{4}$/.test(pin)) {
      pinError.textContent = '⚠️ PIN must be exactly 4 numeric digits.';
      pinError.style.display = 'flex';
      pinInput.classList.add('has-error');
      hasError = true;
    }

    // Validate Confirm PIN
    const confirmPin = pinConfirmInput.value.trim();
    if (confirmPin !== pin) {
      pinConfirmError.textContent = '⚠️ PINs do not match. Please re-enter.';
      pinConfirmError.style.display = 'flex';
      pinConfirmInput.classList.add('has-error');
      hasError = true;
    }

    if (hasError) return;

    try {
      const pinResult = await window.electronAPI.setPin(pin);
      if (!pinResult.success) {
        pinError.textContent = `⚠️ Error setting PIN: ${pinResult.error}`;
        pinError.style.display = 'flex';
        return;
      }

      onContinue({
        disclaimerAccepted: true,
        parentPinHash: pinResult.hash,
        parentPinSalt: pinResult.salt
      });
    } catch (err) {
      pinError.textContent = `⚠️ Unexpected error: ${err.message}`;
      pinError.style.display = 'flex';
    }
  });
}
