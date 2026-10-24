/**
 * Personalization Engine Integration — UI ↔ Service Layer
 *
 * Handles real IPC calls to approval-gate handlers.
 * No simulation or fake data.
 */

export class PEIntegration {
  constructor() {
    this.currentProposal = null;
    this.currentProposalId = null;
    this.learnerId = null;
  }

  /**
   * Fetch pending proposals for a learner
   */
  async getPendingProposals(learnerId) {
    try {
      if (!window.electronAPI) {
        console.warn('[PE] electronAPI not available');
        return [];
      }

      const result = await window.electronAPI.ipcInvoke('pe:get-pending-proposals', learnerId);

      if (result && result.success) {
        return result.proposals || [];
      }

      console.warn('[PE] Failed to get pending proposals:', result?.error);
      return [];
    } catch (err) {
      console.error('[PE] Error fetching pending proposals:', err);
      return [];
    }
  }

  /**
   * Submit user decision (approval or dismissal)
   */
  async submitApproval(proposalId, approved) {
    try {
      if (!window.electronAPI) {
        console.error('[PE] electronAPI not available');
        return { success: false, error: 'IPC bridge not available' };
      }

      const result = await window.electronAPI.ipcInvoke('pe:submit-approval', {
        proposalId,
        approved
      });

      if (!result.success) {
        console.error('[PE] Approval submission failed:', result.error);
        return result;
      }

      return result;
    } catch (err) {
      console.error('[PE] Error submitting approval:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Handle acceptance flow
   */
  async handleAccept(proposalId) {
    try {
      const result = await this.submitApproval(proposalId, true);

      if (result.success && result.persisted) {
        return { success: true, message: 'Preference updated' };
      }

      return {
        success: false,
        message: result.error || 'Failed to update preference'
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Handle dismissal flow
   */
  async handleDismiss(proposalId) {
    try {
      const result = await this.submitApproval(proposalId, false);

      if (result.success) {
        return { success: true, message: 'Dismissed' };
      }

      return {
        success: false,
        message: result.error || 'Failed to dismiss'
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Check if ipcInvoke is available (for testing)
   */
  isAvailable() {
    return !!(window.electronAPI && typeof window.electronAPI.ipcInvoke === 'function');
  }
}

export const peIntegration = new PEIntegration();
