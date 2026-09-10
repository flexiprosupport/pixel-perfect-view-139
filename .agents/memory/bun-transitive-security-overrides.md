---
name: Bun transitive security overrides
description: How to safely verify transitive dependency security pins when multiple major versions are present.
---

For Bun-managed dependencies, do not assume an exact-version override updated every nested copy. A general package override may be required to replace a stale transitive release, even when a more-specific selector is also present.

**Why:** Bun retained an older nested release after an exact selector was added and after a targeted update. The lockfile override metadata looked correct while the resolved dependency tree still contained the vulnerable package.

**How to apply:** After changing security overrides, regenerate the lockfile, install it frozen, inspect the resolved dependency tree, run `bun audit`, and build the application to catch compatibility issues.