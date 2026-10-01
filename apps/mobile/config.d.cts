export function resolveSettings(
  env: Record<string, string | undefined>,
  directory?: string,
): {
  origin: string;
  allowLocalHttp: boolean;
  projectId: string | undefined;
  signing:
    | {
        codeSigningCertificate: string;
        codeSigningMetadata: { keyid: string; alg: "rsa-v1_5-sha256" };
      }
    | undefined;
};
