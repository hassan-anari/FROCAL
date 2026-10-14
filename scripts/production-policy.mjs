// All Vite builds are release builds. Fixtures run through the development server.
export function validateProductionEnvironment(environment) {
  const source = environment.VITE_DATA_SOURCE;
  if (source !== undefined && source !== "" && source !== "remote") {
    throw new Error("Production requires VITE_DATA_SOURCE=remote (or unset).");
  }
  for (const flag of ["VITE_ENABLE_DEV_PANEL", "VITE_ENABLE_ARENA_DEBUG"]) {
    if (environment[flag] && environment[flag] !== "false") {
      throw new Error(`Production forbids ${flag}; remove it or set false.`);
    }
  }
}
