/**
 * Menu Sessions Manager
 * Handles active menu sessions for interactive menu
 */

class MenuSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  set(sessionId, sessionData) {
    this.sessions.set(sessionId, sessionData);
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }

  findByUser(userId) {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        return { id, session };
      }
    }
    return null;
  }

  deleteByUser(userId) {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        return true;
      }
    }
    return false;
  }

  getAll() {
    return this.sessions;
  }

  size() {
    return this.sessions.size;
  }

  clear() {
    this.sessions.clear();
  }
}

// Create a singleton instance
const menuSessions = new MenuSessionManager();

module.exports = menuSessions;