/* Site settings. Safe to be public: no keys, no roster, no answers to scored quizzes. */
window.EDL_CONFIG = {
  courseCode: '00-400-070-003',
  sections: ['คก.683A/2', 'จก.691A'],  // 2026: Ajarn Suparat (room 2603), Ajarn DJ (room คทจ.2602)
  studentIdPattern: '^\\d{10,13}$',     // TODO: match the RMUTI student ID format
  // Phase B: URL of Tony's Google Apps Script Web App (scored listening quiz).
  // Leave empty until the back end is deployed; the Quiz tab stays closed.
  quizEndpoint: ''
};
