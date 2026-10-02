const assert = require("node:assert/strict");
const { verify } = require("node:crypto");
const { createRequire } = require("node:module");
const { test } = require("node:test");

const vector = require("./fixtures/node-forge-nested-digest.json");

// Resolve each real consumer, so a second unpatched copy cannot pass unnoticed.
const expoRequire = createRequire(require.resolve("expo/package.json"));
const cliRequire = createRequire(expoRequire.resolve("@expo/cli/package.json"));
const updatesRequire = createRequire(
  require.resolve("expo-updates/package.json"),
);
const cliCertificatesRequire = createRequire(
  cliRequire.resolve("@expo/code-signing-certificates/package.json"),
);
const updatesCertificatesRequire = createRequire(
  updatesRequire.resolve("@expo/code-signing-certificates/package.json"),
);
const consumers = [
  ["Expo CLI", cliRequire],
  ["Expo CLI certificates", cliCertificatesRequire],
  ["Expo Updates certificates", updatesCertificatesRequire],
];

for (const [name, consumer] of consumers) {
  test(`${name} rejects the upstream nested DigestAlgorithm signature vector`, () => {
    const forge = consumer("node-forge");
    const key = forge.pki.rsa.setPublicKey(
      new forge.jsbn.BigInteger(vector.modulus, 16),
      new forge.jsbn.BigInteger(vector.exponent),
    );
    const digest = forge.md.sha256
      .create()
      .update(vector.message)
      .digest()
      .getBytes();
    // Use public defaults. No padding or DER validation options are bypassed.
    assert.throws(
      () => key.verify(digest, forge.util.hexToBytes(vector.signatureHex)),
      /ASN\.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value/,
    );
  });
}

const forge = cliRequire("node-forge");
const certificates = cliRequire("@expo/code-signing-certificates");
const keyPair = certificates.generateKeyPair();
const certificate = certificates.generateSelfSignedCodeSigningCertificate({
  keyPair,
  validityNotBefore: new Date("2020-01-01T00:00:00Z"),
  validityNotAfter: new Date("2100-01-01T00:00:00Z"),
  commonName: "Luma test update signing",
});

test("valid SHA-1/SHA-256/SHA-384/SHA-512 signatures still verify", () => {
  for (const algorithm of ["sha1", "sha256", "sha384", "sha512"]) {
    const digest = forge.md[algorithm]
      .create()
      .update("local regression control");
    const signature = keyPair.privateKey.sign(digest);
    assert.equal(
      keyPair.publicKey.verify(digest.digest().getBytes(), signature),
      true,
    );
  }
});

test("valid SHA-256 DigestAlgorithm parameters may be present or absent", () => {
  const { asn1 } = forge;
  const digest = forge.md.sha256
    .create()
    .update("optional NULL control")
    .digest()
    .getBytes();
  for (const includeNull of [false, true]) {
    const algorithm = [
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer(forge.pki.oids.sha256).getBytes(),
      ),
    ];
    if (includeNull)
      algorithm.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""),
      );
    const digestInfo = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, algorithm),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest),
      ],
    );
    const signature = keyPair.privateKey.sign(
      asn1.toDer(digestInfo).getBytes(),
      "NONE",
    );
    assert.equal(keyPair.publicKey.verify(digest, signature), true);
  }
});

test("Expo certificates, CSRs and update signing still work with the patched verifier", () => {
  certificates.validateSelfSignedCertificate(certificate, keyPair);
  const csr = certificates.generateCSR(
    keyPair,
    "Luma test development request",
  );
  assert.equal(csr.verify(), true);
  const developmentCertificate =
    certificates.generateDevelopmentCertificateFromCSR(
      keyPair.privateKey,
      certificate,
      csr,
      "ccdb8912-bbf5-4ef5-8e87-a0df35c929e1",
      "@luma/test",
    );
  assert.equal(certificate.verify(developmentCertificate), true);
  const message = Buffer.from("local update manifest control");
  const signature = certificates.signBufferRSASHA256AndVerify(
    keyPair.privateKey,
    certificate,
    message,
  );
  const pem = certificates.convertKeyPairToPEM(keyPair).publicKeyPEM;
  assert.equal(
    verify("sha256", message, pem, Buffer.from(signature, "base64")),
    true,
  );
  assert.equal(
    verify(
      "sha256",
      Buffer.from("tampered manifest"),
      pem,
      Buffer.from(signature, "base64"),
    ),
    false,
  );
});
