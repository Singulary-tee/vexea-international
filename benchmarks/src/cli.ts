import { resolve } from "node:path";
import { loadProfile } from "./validate";
import { runProfile } from "./runner";

interface CliArgs {
  profile: string;
  output: string;
  skipBuild: boolean;
  repetitions?: number;
}

function parseArgs(argv: string[]): CliArgs {
  let profile: string | undefined;
  let output = ".benchmark-artifacts/latest";
  let skipBuild = false;
  let repetitions: number | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--profile") profile = argv[++index];
    else if (arg === "--output") output = argv[++index];
    else if (arg === "--trials") repetitions = Number(argv[++index]);
    else if (arg === "--skip-build") skipBuild = true;
    else if (arg === "--help") {
      console.log("Usage: npm run benchmark -- --profile <file> [--trials N] [--output DIR] [--skip-build]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!profile) throw new Error("--profile is required");
  if (repetitions !== undefined && (!Number.isInteger(repetitions) || repetitions < 1)) {
    throw new Error("--trials must be a positive integer");
  }
  return { profile, output, skipBuild, repetitions };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const profile = loadProfile(resolve(args.profile));
  const output = resolve(args.output);
  const result = await runProfile(profile, {
    outputDir: output,
    skipBuild: args.skipBuild,
    repetitions: args.repetitions,
  });
  console.log(JSON.stringify({
    profile: profile.id,
    output,
    archive: result.archive,
    sloPassed: result.summary.slo.passed,
    validTrials: result.summary.validTrials,
  }));
  if (!result.summary.slo.passed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
