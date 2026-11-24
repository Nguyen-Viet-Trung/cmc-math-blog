import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORUM_RULES_CONTENT,
  DEFAULT_FORUM_RULES_TITLE,
  extractDocumentHeadings,
  slugifyHeading,
} from "../default-forum-rules";

describe("forum rules helpers", () => {
  it("slugifies Vietnamese headings deterministically", () => {
    expect(slugifyHeading("[1] Tôn trọng bản quyền thông tin")).toBe(
      "1-ton-trong-ban-quyen-thong-tin"
    );
    expect(slugifyHeading("Đặt tiêu đề rõ ràng")).toBe("dat-tieu-de-ro-rang");
    expect(slugifyHeading("   ")).toBe("muc");
  });

  it("extracts H2 and H3 headings, skips code fences, and deduplicates IDs", () => {
    const sample = [
      "## Mục lớn",
      "### Điều 1",
      "```md",
      "## Không phải heading",
      "```",
      "### Điều 1",
    ].join("\n");

    const headings = extractDocumentHeadings(sample);
    expect(headings).toEqual([
      { id: "muc-lon", level: 2, text: "Mục lớn" },
      { id: "dieu-1", level: 3, text: "Điều 1" },
      { id: "dieu-1-2", level: 3, text: "Điều 1" },
    ]);
  });

  it("contains all 7 forum rules and both reference links in default content", () => {
    expect(DEFAULT_FORUM_RULES_TITLE).toContain("Nội quy");
    const headings = extractDocumentHeadings(DEFAULT_FORUM_RULES_CONTENT);
    const ruleHeadings = headings.filter((h) => h.level === 3);
    expect(ruleHeadings).toHaveLength(7);
    expect(DEFAULT_FORUM_RULES_CONTENT).toContain(
      "http://www.diendantoanhoc.net/index.php?act=ST&f=72&t=1855&st=0#entry9847"
    );
    expect(DEFAULT_FORUM_RULES_CONTENT).toContain(
      "http://www.diendantoanhoc.net/index.php?showforum=3"
    );
  });
});
