import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { getSql } from "./db";
import {
  DEFAULT_FORUM_RULES_CONTENT,
  DEFAULT_FORUM_RULES_TITLE,
  FORUM_RULES_SLUG,
} from "./default-forum-rules";
import { isDatabaseConfigured } from "./env";
import type { ForumDocument } from "./types";

function getFallbackForumRules(): ForumDocument {
  return {
    slug: FORUM_RULES_SLUG,
    title: DEFAULT_FORUM_RULES_TITLE,
    content: DEFAULT_FORUM_RULES_CONTENT,
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedByName: null,
  };
}

const getCachedForumRules = unstable_cache(
  async (): Promise<ForumDocument> => {
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT
          d.slug,
          d.title,
          d.content,
          d.updated_at,
          p.display_name AS updated_by_name
        FROM public.site_documents d
        LEFT JOIN public.profiles p ON p.id = d.updated_by
        WHERE d.slug = ${FORUM_RULES_SLUG}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return getFallbackForumRules();
      }

      const row = rows[0];
      return {
        slug: String(row.slug),
        title: String(row.title || DEFAULT_FORUM_RULES_TITLE),
        content: String(row.content || DEFAULT_FORUM_RULES_CONTENT),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
        updatedByName: row.updated_by_name ? String(row.updated_by_name) : null,
      };
    } catch {
      return getFallbackForumRules();
    }
  },
  ["forum-rules-document"],
  { revalidate: 300, tags: [CACHE_TAGS.forumRules] }
);

export const getForumRules = cache(async (): Promise<ForumDocument> => {
  if (!isDatabaseConfigured()) {
    return getFallbackForumRules();
  }
  return getCachedForumRules();
});
