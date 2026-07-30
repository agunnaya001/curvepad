# Token Image Upload

CurvePad allows token creators to upload a logo image when launching a token. Images are stored in Replit Object Storage (Google Cloud Storage) via presigned URLs — the file is uploaded directly from the browser to GCS, never touching the CurvePad server.

---

## How It Works

### Two-step presigned URL flow

```
Browser                    API Server              GCS
  │                             │                    │
  │  1. POST /api/storage/      │                    │
  │     uploads/request-url     │                    │
  │   { name, size, type }      │                    │
  │                             │  Sign PUT URL      │
  │                             │ ──────────────────►│
  │                             │◄── signedURL ──────│
  │◄── { uploadURL, objectPath }│                    │
  │                             │                    │
  │  2. PUT uploadURL           │                    │
  │   (file bytes, direct)      │                    │
  │ ──────────────────────────────────────────────►  │
  │◄─────────────────────────────────── 200 OK ───── │
  │                             │                    │
  │  3. Store objectPath        │                    │
  │  4. Display image at:       │                    │
  │     GET /api/storage/       │                    │
  │         objects/{path}      │                    │
```

This approach:
- Keeps large binary uploads off the API server
- Scales to any file size without buffering
- Presigned URLs expire in 15 minutes

---

## API Endpoints

### `POST /api/storage/uploads/request-url`

Request a presigned URL to upload an image.

**Request body:**
```json
{
  "name": "my-token-logo.png",
  "size": 204800,
  "contentType": "image/png"
}
```

**Response:**
```json
{
  "uploadURL": "https://storage.googleapis.com/bucket/path?X-Goog-Signature=...",
  "objectPath": "/objects/uploads/550e8400-e29b-41d4-a716-446655440000"
}
```

### `PUT {uploadURL}`

Upload the file directly to GCS using the presigned URL. Set `Content-Type` to match the `contentType` you specified in step 1.

```bash
curl -X PUT "{uploadURL}" \
  -H "Content-Type: image/png" \
  --data-binary @my-logo.png
```

### `GET /api/storage/objects/{path}`

Serve the uploaded image. Use this URL in `<img>` tags or as the `imageUrl` stored in the token metadata.

The `{path}` is the `objectPath` from step 1 with the leading `/objects/` prefix stripped:

| `objectPath` | Serving URL |
|---|---|
| `/objects/uploads/abc-123` | `/api/storage/objects/uploads/abc-123` |

---

## Frontend Integration

The `useUpload` hook from `@workspace/object-storage-web` handles the two-step flow:

```tsx
import { useUpload } from "@workspace/object-storage-web";

function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      // Convert objectPath → serving URL
      const path = response.objectPath.replace(/^\/objects\//, "");
      onUploaded(`/api/storage/objects/${path}`);
    },
    onError: (error) => {
      console.error("Upload failed:", error.message);
    },
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} />
      {isUploading && <p>Uploading… {progress}%</p>}
    </div>
  );
}
```

---

## Constraints

| Property | Limit |
|---|---|
| Max file size | 5 MB |
| Accepted types | `image/png`, `image/jpeg`, `image/gif`, `image/webp` |
| Presigned URL TTL | 15 minutes |
| Storage | Replit Object Storage (GCS) |
| Access | Public (no auth required to view) |
| Auth to upload | None — token images are public assets |

---

## Environment Variables

These are set up automatically by the Replit Object Storage tool:

| Variable | Purpose |
|---|---|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | GCS bucket identifier |
| `PRIVATE_OBJECT_DIR` | GCS path prefix for uploaded objects |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Comma-separated paths for public assets |

Never set these manually in production — use the Replit Object Storage tool.
