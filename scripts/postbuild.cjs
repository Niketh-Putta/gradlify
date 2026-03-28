const { spawnSync } = require("child_process");

const shouldSkip = Boolean(
  process.env.VERCEL ||
  process.env.CI ||
  process.env.SKIP_REACT_SNAP
);

if (shouldSkip) {
  console.log("Skipping react-snap in CI/Vercel environment.");
  process.exit(0);
}

const result = spawnSync("react-snap", { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
