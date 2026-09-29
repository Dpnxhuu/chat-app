import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import type { UploadApiResponse } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // apna path/config lagana

export async function POST(req: Request) {
  // 1. Session se user id lo (client pe bharosa nahi)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 400 });
  }

  // 2. File checks
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "chat-app-avatar" },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Cloudinary upload returned no result"));
          },
        );
        stream.end(buffer);
      },
    );

    // 3. DB mein sirf URL save karo
    await prisma.user.update({
      where: { id: userId },
      data: { image: uploadResult.secure_url },
      select: { id: true, image: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error!";
    console.error("Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}