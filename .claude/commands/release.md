---
description: Create a new release with version tag, GitHub release notes, and production deployment
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Pre-flight checks**:
   - Verify current branch is `main`: `git branch --show-current`
   - Ensure working directory is clean: `git status --porcelain`
   - If not clean, ask user to commit or stash changes first
   - Pull latest changes: `git pull origin main`

2. **Determine version**:
   - Get the latest version tag: `git tag --list 'v*' | sort -V | tail -1`
   - Parse current version (e.g., v1.7.0 → major=1, minor=7, patch=0)
   - If user provided version in $ARGUMENTS, use that
   - Otherwise, ask user which version bump:
     - **patch** (v1.7.0 → v1.7.1): Bug fixes, minor changes
     - **minor** (v1.7.0 → v1.8.0): New features, backwards compatible
     - **major** (v1.7.0 → v2.0.0): Breaking changes

3. **Generate release notes**:
   - Get commits since last tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
   - Group by type (feat, fix, docs, refactor, etc.)
   - Format as markdown:
     ```markdown
     ## What's Changed

     ### New Features
     - feat: description (#PR)

     ### Bug Fixes
     - fix: description (#PR)

     ### Other Changes
     - chore/docs/refactor: description
     ```
   - Show generated notes to user for confirmation

4. **Create and push tag**:
   - Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   - Push tag to origin: `git push origin vX.Y.Z`

5. **Create GitHub Release**:
   - Use gh CLI: `gh release create vX.Y.Z --title "vX.Y.Z - Title" --notes "..."`
   - Include the generated release notes

6. **Monitor deployment**:
   - Check CI status: `gh run list --limit 1`
   - Wait for deployment to complete (poll every 30 seconds, max 5 minutes)
   - Report deployment status with link to workflow run

7. **Completion summary**:
   - Display:
     - Release URL: `https://github.com/{owner}/{repo}/releases/tag/vX.Y.Z`
     - CI/CD URL: Link to GitHub Actions run
     - Deployment status: Success/Failed
   - If deployment failed, provide troubleshooting guidance

## Error Handling

- If not on main branch: Ask user to switch or abort
- If working directory dirty: List uncommitted files, ask to commit/stash
- If tag already exists: Ask for different version
- If CI fails: Show error details from `gh run view`

## Examples

```bash
# Auto-detect version bump type
/release

# Specify version directly
/release v1.8.0

# Specify bump type
/release patch
/release minor
/release major
```
