import { Pool, type PoolClient, type QueryResult } from "pg";
import { getDatabaseUrl } from "../env";

export type SqlRow = Record<string, unknown>;

export interface SqlRunner {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlRow[]>;
  array: <T>(values: T[]) => T[];
}

export interface SqlClient extends SqlRunner {
  begin: <T>(fn: (tx: SqlRunner) => Promise<T>) => Promise<T>;
}

declare global {
  // eslint-disable-next-line no-var
  var __mathForumPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __mathForumSqlAdapter: SqlClient | undefined;
}

export function buildParameterizedQuery(
  strings: TemplateStringsArray,
  values: unknown[]
): { text: string; params: unknown[] } {
  let text = strings[0] ?? "";
  const params = values.map((v) => (v === undefined ? null : v));
  for (let i = 0; i < params.length; i++) {
    text += `$${i + 1}${strings[i + 1] ?? ""}`;
  }
  return { text, params };
}

function createRunner(
  executor: Pick<Pool | PoolClient, "query">
): SqlRunner {
  const runner = (async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<SqlRow[]> => {
    const { text, params } = buildParameterizedQuery(strings, values);
    const res: QueryResult<SqlRow> = await executor.query(text, params);
    return res.rows;
  }) as SqlRunner;

  runner.array = <T>(values: T[]): T[] => values;
  return runner;
}

function sanitizePgConnectionString(rawUrl: string): {
  connectionString: string;
  useSsl: boolean;
} {
  try {
    const parsed = new URL(rawUrl);
    const isLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";
    parsed.searchParams.delete("pgbouncer");
    parsed.searchParams.delete("sslmode");
    return {
      connectionString: parsed.toString(),
      useSsl: !isLocal,
    };
  } catch {
    return {
      connectionString: rawUrl
        .replace(/([?&])(pgbouncer|sslmode)=[^&]*(&|$)/g, "$1")
        .replace(/[?&]$/, ""),
      useSsl: !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1"),
    };
  }
}

/**
 * Kết nối PostgreSQL qua `pg` (node-postgres) — KHÔNG pipeline nhiều truy vấn trên cùng 1 socket.
 * Loại bỏ triệt để lỗi treo kết nối / trộn kết quả (protocol desync) giữa `postgres.js`
 * và Supabase Supavisor Transaction Pooler (:6543) trên môi trường Serverless (Vercel).
 */
export function getSql(): SqlClient {
  const rawUrl = getDatabaseUrl();
  if (!rawUrl) {
    throw new Error(
      "Hệ thống chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra cấu hình DATABASE_URL."
    );
  }

  if (!globalThis.__mathForumPgPool) {
    const { connectionString, useSsl } = sanitizePgConnectionString(rawUrl);
    const parsedMax = Number(process.env.PG_POOL_MAX ?? 6);
    const poolMax = Number.isFinite(parsedMax)
      ? Math.max(1, Math.min(10, Math.trunc(parsedMax)))
      : 6;
    const idleTimeoutMillis =
      process.env.NODE_ENV === "production" ? 30_000 : 60_000;

    const pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: poolMax,
      idleTimeoutMillis,
      connectionTimeoutMillis: 8_000,
      query_timeout: 8_000,
      allowExitOnIdle: true,
    });

    pool.on("error", (err) => {
      console.error("[pg-pool] idle client error:", err.message);
    });

    globalThis.__mathForumPgPool = pool;
  }

  if (!globalThis.__mathForumSqlAdapter) {
    const pool = globalThis.__mathForumPgPool;
    const baseRunner = createRunner(pool) as SqlClient;

    baseRunner.begin = async <T>(
      fn: (tx: SqlRunner) => Promise<T>
    ): Promise<T> => {
      const client = await pool.connect();
      const tx = createRunner(client);
      try {
        await client.query("BEGIN");
        const result = await fn(tx);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback error if socket already closed
        }
        throw err;
      } finally {
        client.release();
      }
    };

    globalThis.__mathForumSqlAdapter = baseRunner;
  }

  return globalThis.__mathForumSqlAdapter;
}
