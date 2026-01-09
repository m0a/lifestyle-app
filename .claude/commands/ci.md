# ci

Check the status of the latest GitHub Actions CI run for the current branch.

## Usage

```
/ci
```

## Implementation

Execute the following command and display the result in a user-friendly format:

```bash
gh run list --branch $(git branch --show-current) --limit 1 --json status,conclusion,workflowName,url
```

Show:
- Status (in_progress, completed, etc.)
- Conclusion (success, failure, or N/A)
- Workflow name
- URL to the CI run
