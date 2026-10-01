const { spawn } = require("node:child_process");

const { appOrigin } = require("../origin.cjs");

function demoSettings(target, env) {
  if (!["ios", "android", "device"].includes(target)) {
    throw new Error("Choose ios, android or device.");
  }
  if (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== "development") {
    throw new Error(
      "Run demos outside preview and production build environments.",
    );
  }
  if (target === "device" && !env.EXPO_PUBLIC_APP_URL) {
    throw new Error(
      "Set EXPO_PUBLIC_APP_URL to a tested HTTPS app origin for a physical phone.",
    );
  }
  // The Android emulator reaches this computer through its fixed host alias.
  // eslint-disable-next-line sonarjs/no-hardcoded-ip -- Android emulator host alias
  const localHost = target === "android" ? "10.0.2.2" : "localhost";
  const origin = appOrigin(
    env.EXPO_PUBLIC_APP_URL || `http://${localHost}:3004`,
    target !== "device",
  );
  const probe = new URL(origin);
  // Only the emulator understands this alias; the readiness check runs on the host.
  // eslint-disable-next-line sonarjs/no-hardcoded-ip -- translate Android emulator alias for host probe
  if (probe.hostname === "10.0.2.2") probe.hostname = "localhost";
  return {
    origin,
    probeUrl: probe.href,
    env: {
      ...env,
      NODE_ENV: "development",
      EAS_BUILD_PROFILE: "development",
      EXPO_PUBLIC_APP_URL: origin,
      EXPO_PUBLIC_ALLOW_LOCAL_HTTP: origin.startsWith("http:") ? "1" : "0",
    },
  };
}

async function checkOrigin(settings, fetchPage = fetch) {
  const response = await fetchPage(settings.probeUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  try {
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (
        !location ||
        new URL(location, settings.probeUrl).origin !==
          new URL(settings.probeUrl).origin
      ) {
        throw new Error(
          "App origin redirects to another origin. Configure the final trusted origin.",
        );
      }
    } else if (!response.ok) {
      throw new Error(
        `App origin returned HTTP ${response.status}. Start or repair the web server first.`,
      );
    }
  } finally {
    await response.body?.cancel();
  }
}

async function main() {
  const [target, option] = process.argv.slice(2);
  if (option && option !== "--check")
    throw new Error("Only --check is supported.");
  const settings = demoSettings(target, process.env);
  await checkOrigin(settings);
  process.stdout.write(`Web origin responds: ${settings.origin}\n`);
  if (option === "--check") return;
  process.stdout.write(
    "Starting Metro for an installed development build. This command does not build or install the app.\n",
  );
  const child = spawn(
    process.execPath,
    [require.resolve("expo/bin/cli"), "start", "--dev-client"],
    {
      cwd: require("node:path").resolve(__dirname, ".."),
      env: settings.env,
      stdio: "inherit",
    },
  );
  child.on("error", (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}

if (require.main === module) {
  // eslint-disable-next-line unicorn/prefer-await -- CommonJS entry points cannot use top-level await.
  main().catch((error) => {
    process.stderr.write(`Mobile demo not started: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { demoSettings, checkOrigin };
