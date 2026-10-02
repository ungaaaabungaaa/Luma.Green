"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileWarningIcon,
  PlayIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { FileType } from "../../../../convex/lib/onboarding";
import { formatBytes } from "../format";
import { FILE_TYPE_LABELS } from "../labels";
import { downloadBlob, openBlob, useBlobSource } from "./blob-url";
import {
  browserFileDeps,
  fetchPrivateFile,
  PrivateFileError,
  PROBLEM_MESSAGES,
} from "./private-file";

export interface FileSummary {
  id: string;
  type: FileType;
  name: string;
  contentType: string;
  size: number;
}

type Preview = "image" | "pdf" | "video" | "none";

export function previewFor(contentType: string): Preview {
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  return contentType.startsWith("video/") ? "video" : "none";
}

/** Certificates and IDs first; they're what the checks are about. */
const TYPE_ORDER: readonly FileType[] = [
  "pcb_certificate",
  "id_proof",
  "selfie",
  "machine_media",
];

/** An application's uploads, each fetched through the checked file route. */
export function FileGallery({
  files,
  emptyText,
}: {
  files: readonly FileSummary[];
  emptyText: string;
}) {
  const sorted = files.toSorted(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  );
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t border-border pt-6">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Documents and photos
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Private files: only the applicant and you can open them.
        </p>
      </header>
      <div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sorted.map((file) => (
              <li
                key={file.id}
                className={cn(
                  previewFor(file.contentType) === "pdf" && "sm:col-span-2",
                )}
              >
                <PrivateFilePreview file={file} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PrivateFilePreview({ file }: { file: FileSummary }) {
  const preview = previewFor(file.contentType);
  // Videos can be 20 MB: load one only when asked.
  const [isWanted, setIsWanted] = useState(preview !== "video");
  const query = useQuery({
    queryKey: ["admin", "private-file", file.id],
    queryFn: () => fetchPrivateFile(file, browserFileDeps),
    enabled: isWanted,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: (failures, error) =>
      error instanceof PrivateFileError &&
      error.problem === "failed" &&
      failures < 2,
  });
  const label = `${FILE_TYPE_LABELS[file.type]}: ${file.name}`;

  let body: ReactNode;
  if (!isWanted) {
    body = (
      <Button
        variant="secondary"
        className="aspect-video h-auto w-full flex-col gap-2"
        onClick={() => {
          setIsWanted(true);
        }}
      >
        <PlayIcon aria-hidden className="size-6" />
        Load the video ({formatBytes(file.size)})
      </Button>
    );
  } else if (query.isPending) {
    body = (
      <Skeleton
        className={cn("w-full", preview === "pdf" ? "h-96" : "aspect-4/3")}
      />
    );
  } else if (query.isError) {
    const problem =
      query.error instanceof PrivateFileError ? query.error.problem : "failed";
    body = (
      <div
        role="alert"
        className="flex aspect-4/3 w-full flex-col items-center justify-center gap-3 rounded-md bg-muted p-4 text-center text-sm"
      >
        <FileWarningIcon aria-hidden className="size-6 text-muted-foreground" />
        <p>{PROBLEM_MESSAGES[problem]}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void query.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  } else {
    body = <BlobPreview blob={query.data} preview={preview} label={label} />;
  }

  return (
    <figure className="flex h-full min-w-0 flex-col gap-3 border-b pb-4">
      {body}
      <figcaption className="flex flex-wrap items-end justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            {FILE_TYPE_LABELS[file.type]}
          </span>
          <span className="text-sm font-medium break-all" title={file.name}>
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </span>
        {query.data ? (
          <FileActions blob={query.data} file={file} preview={preview} />
        ) : null}
      </figcaption>
    </figure>
  );
}

function BlobPreview({
  blob,
  preview,
  label,
}: {
  blob: Blob;
  preview: Preview;
  label: string;
}) {
  const source = useBlobSource(blob);
  switch (preview) {
    case "image": {
      return (
        // A private blob can't go through next/image's optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={source}
          alt={label}
          className="aspect-4/3 max-h-96 w-full bg-muted object-contain"
        />
      );
    }
    case "pdf": {
      return (
        <iframe
          ref={source}
          title={label}
          className="h-112 w-full border bg-muted"
        />
      );
    }
    case "video": {
      return (
        <video
          ref={source}
          controls
          preload="metadata"
          aria-label={label}
          className="aspect-video max-h-96 w-full bg-foreground"
        />
      );
    }
    case "none": {
      return (
        <p className="flex aspect-4/3 w-full items-center justify-center rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
          No preview for this kind of file. Download it to open it.
        </p>
      );
    }
  }
}

function FileActions({
  blob,
  file,
  preview,
}: {
  blob: Blob;
  file: FileSummary;
  preview: Preview;
}) {
  // SVG (demo pictures only) opened as a page could run script; it stays inline.
  const canOpen =
    (preview === "pdf" || preview === "image") &&
    file.contentType !== "image/svg+xml";
  return (
    <span className="flex flex-wrap gap-1">
      {canOpen ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Open ${file.name} in a new tab`}
          onClick={() => {
            openBlob(blob);
          }}
        >
          <ExternalLinkIcon aria-hidden />
          Open
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Download ${file.name}`}
        onClick={() => {
          downloadBlob(blob, file.name);
        }}
      >
        <DownloadIcon aria-hidden />
        Download
      </Button>
    </span>
  );
}
