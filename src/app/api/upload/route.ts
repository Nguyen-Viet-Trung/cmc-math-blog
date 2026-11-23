import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  MAX_BACKEND_IMAGE_BYTES,
  STORAGE_BUCKET,
  isSupabaseStorageConfigured,
} from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { validateUploadPayload } from "@/lib/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

let bucketVerified = false;

export async function POST(request: Request) {
  try {
    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình khóa Supabase Storage trong key.txt. Vui lòng điền key và chạy `npm run setup`.",
        },
        { status: 503 }
      );
    }

    const user = await getCurrentUserProfile();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập trước khi tải ảnh lên." },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Tài khoản của bạn đang bị khóa." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "threads");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy tập tin ảnh tải lên." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const headerBytes = new Uint8Array(buffer.subarray(0, 16));

    const check = validateUploadPayload({
      sizeBytes: buffer.byteLength,
      mimeType: file.type,
      headerBytes,
      folder,
      userRole: user.role,
    });

    if (!check.ok) {
      return NextResponse.json(
        { error: check.error },
        { status: check.statusCode ?? 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    if (!bucketVerified) {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (!buckets?.some((b) => b.name === STORAGE_BUCKET)) {
        await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: MAX_BACKEND_IMAGE_BYTES,
          allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
        });
      }
      bucketVerified = true;
    }

    const ext =
      file.type === "image/webp"
        ? "webp"
        : file.type === "image/png"
          ? "png"
          : "jpg";
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const objectPath = `${folder}/${user.id}/${uniqueName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json(
        { error: `Tải ảnh lên Storage thất bại: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: pub } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      url: pub.publicUrl,
      bytes: buffer.byteLength,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định khi tải ảnh.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
