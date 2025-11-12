import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private static instance: ObjectStorageService | null = null;
  private publicObjectSearchPaths: Array<string>;
  private privateObjectDir: string;

  private constructor() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    this.publicObjectSearchPaths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (this.publicObjectSearchPaths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }

    this.privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!this.privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
  }

  static getInstance(): ObjectStorageService {
    if (!ObjectStorageService.instance) {
      ObjectStorageService.instance = new ObjectStorageService();
    }
    return ObjectStorageService.instance;
  }

  getPublicObjectSearchPaths(): Array<string> {
    return this.publicObjectSearchPaths;
  }

  getPrivateObjectDir(): string {
    return this.privateObjectDir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<{ uploadUrl: string; objectKey: string; method: string }> {
    const privateObjectDir = this.getPrivateObjectDir();

    console.log(`[getObjectEntityUploadURL] PRIVATE_OBJECT_DIR: ${privateObjectDir}`);

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const method = "PUT";
    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method,
      ttlSec: 900,
    });

    const objectKey = `/objects/${objectId}`;

    console.log(`[getObjectEntityUploadURL] ====== UPLOAD URL GENERATION ======`);
    console.log(`[getObjectEntityUploadURL] Object ID: ${objectId}`);
    console.log(`[getObjectEntityUploadURL] Full physical path: ${fullPath}`);
    console.log(`[getObjectEntityUploadURL] Bucket: ${bucketName}`);
    console.log(`[getObjectEntityUploadURL] Object name in bucket: ${objectName}`);
    console.log(`[getObjectEntityUploadURL] Object key (API path): ${objectKey}`);
    console.log(`[getObjectEntityUploadURL] Signed upload URL: ${uploadUrl}`);
    console.log(`[getObjectEntityUploadURL] =====================================`);

    return { uploadUrl, objectKey, method };
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    console.log(`[getObjectEntityFile] Retrieving object: ${objectPath}`);
    
    if (!objectPath.startsWith("/objects/")) {
      console.log(`[getObjectEntityFile] Path does not start with /objects/`);
      throw new ObjectNotFoundError();
    }

    const relativePath = objectPath.substring("/objects/".length);
    console.log(`[getObjectEntityFile] Relative path: ${relativePath}`);
    
    if (!relativePath) {
      console.log(`[getObjectEntityFile] Empty relative path`);
      throw new ObjectNotFoundError();
    }

    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${relativePath}`;
    console.log(`[getObjectEntityFile] Full object path: ${objectEntityPath}`);
    
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    console.log(`[getObjectEntityFile] Bucket: ${bucketName}, Object: ${objectName}`);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    
    if (!exists) {
      console.log(`[getObjectEntityFile] Object does not exist in storage`);
      throw new ObjectNotFoundError();
    }
    
    console.log(`[getObjectEntityFile] Object found successfully`);
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async setObjectKeyAclPolicy(
    objectKey: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<void> {
    if (!objectKey.startsWith("/objects/")) {
      throw new Error("Invalid object key format. Must start with /objects/");
    }

    const objectFile = await this.getObjectEntityFile(objectKey);
    await setObjectAclPolicy(objectFile, aclPolicy);
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
