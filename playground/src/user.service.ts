// ─── Valid: top-level enum (not inside a class body) ────────────────────────
export enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

// Valid: top-level constant
export const API_BASE = '/api/v1';

// ─── Mock Angular decorator (argument strings are ignored) ───────────────────
function Injectable(_opts?: { providedIn: string }) {
  return function <T extends new (...args: unknown[]) => unknown>(target: T) {
    return target;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Decorator argument strings are intentionally NOT flagged (isInsideDecorator).
@Injectable({ providedIn: 'root' })
export class UserService {
  // VIOLATION: hardcoded string in property initialiser
  private endpoint = '/api/users';

  // VIOLATION: hardcoded string in property initialiser
  private errorMessage = 'Failed to fetch users';

  // Valid: uses enum value (exported so TS doesn't flag it as unused)
  readonly defaultRole = UserRole.Viewer;

  // Valid: references the top-level constant
  private baseUrl = API_BASE;

  getUsers(): string {
    // VIOLATION: hardcoded string literal in method body
    const tag = 'UserService';
    console.log('getUsers called'); // Valid: console.log is ignored by default
    return `${this.baseUrl}${this.endpoint}?tag=${tag}`;
  }

  handleError(code: number): string {
    if (code === 404) {
      // VIOLATION: hardcoded string in return statement
      return 'User not found';
    }
    // Valid: returns a class property, not a literal
    return this.errorMessage;
  }

  getLegacyPath(): string {
    // no-literals-ignore
    return '/legacy/v0/users'; // Valid: suppressed — comment must be on line N-1 or N
  }
}
