import api from './api';

export const abhaService = {
  /**
   * Retrieves the current authenticated user's ABHA profile, health ID, and linked document stats.
   */
  async getMyAbhaProfile() {
    return await api.get('/abha/me');
  },

  /**
   * Searches for a patient by ABHA identifier (Demo Health ID, 14-digit number, or address).
   * Returns authorized records if consent exists, or a masked preview with consent request action.
   */
  async searchAbha(identifier) {
    const clean = encodeURIComponent((identifier || '').trim());
    return await api.get(`/abha/search/${clean}`);
  },

  /**
   * Submits a consent request to access a patient's medical records.
   */
  async requestConsent({ targetIdentifier, purpose, purposeDescription, scope, durationDays }) {
    return await api.post('/abha/consent/request', {
      targetIdentifier,
      purpose,
      purposeDescription,
      scope,
      durationDays,
    });
  },

  /**
   * Retrieves both incoming (requests for user's records) and outgoing consent requests.
   */
  async getConsentRequests() {
    return await api.get('/abha/consent/requests');
  },

  /**
   * Grants/approves an incoming record access request.
   */
  async grantConsent(consentId) {
    return await api.post(`/abha/consent/${consentId}/grant`);
  },

  /**
   * Rejects an incoming record access request.
   */
  async rejectConsent(consentId) {
    return await api.post(`/abha/consent/${consentId}/reject`);
  },

  /**
   * Revokes a previously granted consent, immediately blocking subsequent access.
   */
  async revokeConsent(consentId) {
    return await api.post(`/abha/consent/${consentId}/revoke`);
  },

  /**
   * Fetches permitted documents for an authorized patient.
   */
  async getAuthorizedDocuments(patientId) {
    return await api.get(`/abha/patients/${patientId}/documents`);
  },

  /**
   * Generates secure streaming URL for an authorized document file.
   */
  getAuthorizedDocumentFileUrl(patientId, documentId) {
    return `/api/abha/patients/${patientId}/documents/${documentId}/file`;
  },

  /**
   * Links or updates official/mock ABHA identity credentials.
   */
  async linkOfficialAbha({ abhaNumber, abhaAddress }) {
    return await api.post('/abha/link-official', { abhaNumber, abhaAddress });
  },
};

export default abhaService;
