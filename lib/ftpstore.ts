interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

interface FileSession {
  files: FTPFile[];
  expires: number;
  credentials?: {
    host: string;
    user: string;
    password: string;
    port: number;
  };
  currentPath: string;
}

const ftpStore: Record<string, FileSession> = {};

export function setFileList(
  sessionId: string,
  files: FTPFile[],
  credentials: FileSession["credentials"],
  currentPath: string,
  ttl: number = 3600 * 1000
) {
  ftpStore[sessionId] = {
    files,
    expires: Date.now() + ttl,
    credentials,
    currentPath,
  };
}

export function getFileList(sessionId: string): FileSession | null {
  const session = ftpStore[sessionId];
  if (!session || Date.now() > session.expires) {
    delete ftpStore[sessionId];
    return null;
  }
  return session;
}

export function clearExpiredSessions() {
  const now = Date.now();
  for (const sessionId in ftpStore) {
    if (now > ftpStore[sessionId].expires) {
      delete ftpStore[sessionId];
    }
  }
}