import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envLocalPath)) return;
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

export const DEFAULT_RULES_TITLE = "Nội quy Diễn đàn Toán học";

export const DEFAULT_RULES_CONTENT = `> **Các thành viên Diễn đàn Toán học thân mến,**
>
> Diễn đàn Toán học được lập ra nhằm mục đích tạo môi trường giao lưu về Toán và các vấn đề khoa học chung dành cho người Việt Nam. Vì vậy **Nội quy Diễn đàn** mà nhóm quản lý và cộng tác viên đưa ra sau đây không mang tính thật sự nghiêm khắc như bản thân nghĩa của từ này, mà chỉ nhằm mục đích xây dựng Diễn đàn tốt hơn, nghiêm túc về khoa học và trật tự hơn.
>
> Vậy mong tất cả các thành viên tham gia Diễn đàn cùng thống nhất với Nhóm quản lý và cộng tác viên những quy định cơ bản sau.

## Một số quy định về viết bài trên Diễn đàn Toán học

### [1] Tôn trọng bản quyền thông tin

Mọi thông tin các thành viên đưa ra trên Diễn đàn Toán học đều phải đảm bảo nếu lấy từ đâu phải **ghi rõ nguồn gốc, họ tên đầy đủ hoặc nick** (nếu là bài trên diễn đàn khác) của tác giả. Nếu không rõ tác giả là ai thì cần ghi rõ nguồn gốc từ trang web nào và **để link đến chính bài viết nguyên bản**.

- Tham khảo thêm tại: [Chú ý về việc lấy bài viết từ nguồn gốc khác](http://www.diendantoanhoc.net/index.php?act=ST&f=72&t=1855&st=0#entry9847)
- Ngoài ra, mọi thông tin từ Diễn đàn Toán học nếu các thành viên dùng để đưa lại trên các nơi khác (diễn đàn khác...) đều phải ghi rõ nguồn gốc và nick của tác giả bài viết đó, cũng như để link đến Diễn đàn Toán học.

### [2] Không chat chit trong các forum dành cho thảo luận về Toán

Tất cả các bài viết mang nội dung chat chit trong các box này **sẽ bị xóa không cần báo trước**.

Mọi câu hỏi về các vấn đề riêng tư thăm hỏi lẫn nhau các bạn có thể dùng chức năng **Gửi tin nhắn** trên Diễn đàn, hoặc trong forum *Giao lưu, kết bạn, Quán cóc...*

### [3] Không post những bài viết kết luận vô căn cứ trên các forum thảo luận về Toán

Những bài viết nội dung chỉ gồm các nhận xét cá nhân mà không có căn cứ rõ rệt — ví dụ: *"Bài này sai rồi"*, *"Bài hay quá..."*, hay đưa ra những lời phỏng đoán không căn cứ... — **cũng sẽ bị xóa không cần báo trước**.

### [4] Đặt tiêu đề rõ ràng, mang nội dung đầy đủ cho topic của mình và post đúng nơi

- Các bạn hết sức tránh đặt những tiêu đề chung chung như: *"Giúp tôi với"*, *"Help, help..."* trong các forum dành cho thảo luận về Toán. Nếu cần thiết các bạn có thể chú thích thêm cho tiêu đề topic của mình.
- Hiện nay Diễn đàn Toán học đã được phân chia theo từng **chuyên mục Toán** khá cụ thể, các bạn nên đưa bài viết của mình vào đúng chỗ.
- Các bạn cũng **tránh dùng chữ hoa (IN HOA)** trong toàn bộ bài viết hoặc toàn bộ tên chủ đề để tạo sự thống nhất trong Diễn đàn.
- Các bài viết vi phạm một trong những điều nói trên sẽ bị **xóa hoặc chỉnh sửa**.

### [5] Không dùng quá nhiều biểu tượng smiles trong các bài viết ở các box Thảo luận về Toán

Hãy giữ nội dung trao đổi học thuật gọn gàng, dễ đọc và tập trung vào lập luận Toán học.

### [6] Viết bài tiếng Việt và sử dụng chức năng gõ công thức Toán học trên Diễn đàn

Đây là Diễn đàn dành cho người Việt Nam nên các bạn tham gia cố gắng viết bài bằng **tiếng Việt** có dấu. Ngoài ra Diễn đàn có hỗ trợ gõ công thức Toán bằng **LaTeX** (ví dụ: $\\frac{a}{b}$, $\\sqrt{x^2 + y^2}$, $\\sum_{i=1}^{n} a_i$).

Các bạn có thể xem kỹ hơn về điều này trong forum [Công thức Toán trên Diễn đàn](http://www.diendantoanhoc.net/index.php?showforum=3); mọi thắc mắc các bạn có thể đưa ra ở đây, nhóm quản lý và cộng tác viên của diễn đàn sẽ giải đáp cho bạn trong thời gian ngắn nhất có thể.

> **Lưu ý quan trọng về TeX:**
> Những thành viên có **từ 10 bài viết trở lên** trên diễn đàn cần sử dụng TeX trong các bài viết tiếp theo của mình nếu như cần phải gõ công thức Toán. Nếu bạn có nhu cầu và đề nghị, nhóm quản lý sẵn sàng cử người hướng dẫn trực tiếp bạn gõ công thức Toán trên diễn đàn. Nếu bạn đã có từ 10 bài viết trở lên trên diễn đàn nhưng vẫn tiếp tục không sử dụng TeX khi gõ công thức Toán, bài viết sẽ được **dời đi khỏi nơi thảo luận không báo trước**.

### [7] Không đăng những bài viết mang tính chất quảng cáo dịch vụ trên Diễn đàn

Tất cả những bài viết quảng cáo dịch vụ, kinh doanh, kiếm tiền qua mạng... đều **sẽ bị xóa không cần báo trước**.

---

*Thân mến,*
**Nhóm quản lý và cộng tác viên Diễn đàn**`;

export async function ensureForumRulesSeeded(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS public.site_documents (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_site_documents_updated_by
    ON public.site_documents(updated_by)
  `;
  await sql`ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY`;

  const inserted = await sql`
    INSERT INTO public.site_documents (slug, title, content, updated_at)
    VALUES ('rules', ${DEFAULT_RULES_TITLE}, ${DEFAULT_RULES_CONTENT}, NOW())
    ON CONFLICT (slug) DO NOTHING
    RETURNING slug, title, length(content)::int AS content_length
  `;

  if (inserted.length > 0) {
    console.log(
      `✅ Đã khởi tạo Nội quy Diễn đàn ('${inserted[0].slug}', ${inserted[0].content_length} ký tự).`
    );
  } else {
    const existing = await sql`
      SELECT slug, title, length(content)::int AS content_length
      FROM public.site_documents
      WHERE slug = 'rules'
      LIMIT 1
    `;
    console.log(
      `ℹ️ Nội quy Diễn đàn đã tồn tại ('${existing[0]?.slug}', ${existing[0]?.content_length} ký tự).`
    );
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  loadEnvLocal();
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Thiếu DIRECT_URL / DATABASE_URL trong .env.local");
    process.exit(1);
  }
  const sql = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 10 });
  ensureForumRulesSeeded(sql)
    .finally(() => sql.end())
    .catch((err) => {
      console.error("❌ Lỗi khởi tạo bảng site_documents:", err?.message || err);
      process.exit(1);
    });
}
