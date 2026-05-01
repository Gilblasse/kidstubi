import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const QUERIES_DIR = join(__dirname, '..', 'db', 'queries');

// Functions whose first parameter is something other than `parentId`.
// Each entry must declare which token the function source MUST contain
// somewhere — the tenant identifier the function is scoped against.
const ALLOWLIST: Record<string, { firstParam: string; mustReference: string }> = {
  getParentByClerkId: { firstParam: 'clerkUserId', mustReference: 'clerkUserId' },
  upsertParentByClerkId: { firstParam: 'input', mustReference: 'input.clerkUserId' },
  setPinHash: { firstParam: 'parentId', mustReference: 'parentId' },
  getPinHashForParent: { firstParam: 'parentId', mustReference: 'parentId' },
  insertPendingApproval: { firstParam: 'input', mustReference: 'input.kidProfileId' },
  insertNotification: { firstParam: 'input', mustReference: '{ parentId' },
  closeScreenTimeSession: { firstParam: 'parentId', mustReference: 'parentId' },
  insertSearchHistory: { firstParam: 'input', mustReference: 'input.parentId' },
  recordWatch: { firstParam: 'input', mustReference: 'input.parentId' },
};

type ExportedFn = {
  file: string;
  source: string;
  name: string;
  firstParam: string;
};

function parseExportedFunctions(file: string, source: string): ExportedFn[] {
  const out: ExportedFn[] = [];
  const re =
    /export\s+(?:async\s+)?function\s+(\w+)\s*\(\s*([\w$]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    out.push({ file, source, name: m[1]!, firstParam: m[2]! });
  }
  return out;
}

// Zero-arg exported functions are intentionally cross-tenant. Each must be
// allow-listed with a comment explaining its sole caller.
const ZERO_ARG_ALLOWLIST: Record<string, string> = {
  // channels.ts — used only by app/api/cron/channel-uploads/route.ts after
  // CRON_SECRET bearer verification. Iterates every approved channel across
  // tenants to detect new uploads.
  listAllApprovedChannelsAcrossTenants: 'cron channel-uploads',
};

describe('tenant scoping: zero-arg exported query functions', () => {
  const files = readdirSync(QUERIES_DIR).filter((f) => f.endsWith('.ts'));
  const zeroArg: Array<{ file: string; name: string }> = [];
  const re = /export\s+(?:async\s+)?function\s+(\w+)\s*\(\s*\)/g;
  for (const file of files) {
    const source = readFileSync(join(QUERIES_DIR, file), 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      zeroArg.push({ file, name: m[1]! });
    }
  }

  it('has at least one allow-listed zero-arg function (sanity)', () => {
    expect(Object.keys(ZERO_ARG_ALLOWLIST).length).toBeGreaterThan(0);
  });

  for (const fn of zeroArg) {
    it(`${fn.file}::${fn.name} is in the zero-arg allow-list`, () => {
      const reason = ZERO_ARG_ALLOWLIST[fn.name];
      if (!reason) {
        throw new Error(
          `${fn.file}::${fn.name} is exported with no parameters and is NOT allow-listed. ` +
            `Zero-arg query functions are cross-tenant by definition. Either add tenant scoping ` +
            `or add ${fn.name} to ZERO_ARG_ALLOWLIST with the caller name.`,
        );
      }
      expect(reason.length).toBeGreaterThan(0);
    });
  }
});

describe('tenant scoping: every db/queries export', () => {
  const files = readdirSync(QUERIES_DIR).filter((f) => f.endsWith('.ts'));
  const allFns: ExportedFn[] = [];
  for (const file of files) {
    const source = readFileSync(join(QUERIES_DIR, file), 'utf8');
    allFns.push(...parseExportedFunctions(file, source));
  }

  it('discovers query functions from every domain file', () => {
    expect(allFns.length).toBeGreaterThan(15);
    const fileNames = new Set(allFns.map((f) => f.file));
    expect(fileNames.size).toBeGreaterThanOrEqual(6);
  });

  for (const fn of allFns) {
    it(`${fn.file}::${fn.name} is tenant-scoped`, () => {
      if (fn.firstParam === 'parentId') return;
      const allow = ALLOWLIST[fn.name];
      if (!allow) {
        throw new Error(
          `${fn.file}::${fn.name} first param is "${fn.firstParam}". ` +
            `Tenant scoping requires parentId, OR add ${fn.name} to the allow-list with a justification.`,
        );
      }
      expect(fn.firstParam).toBe(allow.firstParam);
      expect(
        fn.source.includes(allow.mustReference),
        `Allow-listed ${fn.name} must reference "${allow.mustReference}" in the source — that's the tenant scoping it claims to enforce.`,
      ).toBe(true);
    });
  }
});
