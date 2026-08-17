import { createUploadthing, type FileRouter } from "uploadthing/next";

type UploadedFileShape = { url: string; name?: string; key?: string };

const f = createUploadthing();

export const ourFileRouter = {
  test: f({ image: { maxFileSize: "8MB", maxFileCount: 8 } })
    .middleware(async () => {
      return { userId: "u1" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { url, name, key } = file as unknown as UploadedFileShape;
      return { url: url ?? "", name: name ?? "", key: key ?? "", userId: metadata.userId };
    }),
} satisfies FileRouter;
