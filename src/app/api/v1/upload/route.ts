import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils/auth-guard';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// POST — upload foto (base64 atau multipart form-data)
// Menyimpan ke /public/uploads/ dan return URL yang bisa diakses browser
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const contentType = req.headers.get('content-type') ?? '';
    let buffer: Buffer;
    let extension = 'jpg';

    if (contentType.includes('application/json')) {
      // Mode base64
      const body = await req.json();
      const base64 = body.photo_base64 as string;

      if (!base64) {
        return NextResponse.json(
          { success: false, error: 'Field photo_base64 wajib diisi' },
          { status: 400 },
        );
      }

      // Strip data URL prefix kalau ada: "data:image/jpeg;base64,..."
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const mimeMatch  = base64.match(/data:([^;]+);/);
      if (mimeMatch?.[1]?.includes('png')) extension = 'png';

      buffer = Buffer.from(base64Data, 'base64');

    } else if (contentType.includes('multipart/form-data')) {
      // Mode file upload
      const formData = await req.formData();
      const file     = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'File wajib disertakan' },
          { status: 400 },
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Ukuran file maksimal 5MB' },
          { status: 413 },
        );
      }

      extension = file.name.split('.').pop() ?? 'jpg';
      buffer    = Buffer.from(await file.arrayBuffer());

    } else {
      return NextResponse.json(
        { success: false, error: 'Content-Type harus application/json atau multipart/form-data' },
        { status: 415 },
      );
    }

    // Simpan ke /public/uploads/YYYY-MM/filename.ext
    const dateFolder = new Date().toISOString().slice(0, 7); // "2026-06"
    const uploadDir  = join(process.cwd(), 'public', 'uploads', dateFolder);

    await mkdir(uploadDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/${dateFolder}/${filename}`;

    return NextResponse.json({ success: true, data: { url } }, { status: 201 });

  } catch (err) {
    console.error('[upload] error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan foto' },
      { status: 500 },
    );
  }
}
