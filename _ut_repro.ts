import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  test: f({ image: { maxFileSize: "8MB", maxFileCount: 8 } })
    .middleware(async () => {
      return { userId: "u1" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url: string = file.url;
      const name: string = file.name;
      const key: string = file.key;
      return { url, name, key, userId: metadata.userId };
    }),
} satisfies FileRouter;
