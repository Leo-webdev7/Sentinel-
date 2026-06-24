# Data Model: Build Pipeline

**Feature**: 001-build-pipeline
**Date**: 2026-06-24

## Overview

The build pipeline is a stateless CI/CD system. There is no persistent
data model - the "entities" are workflow configurations and their
runtime states.

## Entities

### Pipeline Configuration

Represents a GitHub Actions workflow definition.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Workflow display name |
| triggers | array | Events that start the pipeline |
| jobs | array | Ordered list of jobs to execute |
| secrets | array | Required secret references |

**State Transitions**:
- `configured` → `triggered` → `running` → `success` | `failure`

### Pipeline Run

Represents a single execution of a pipeline.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique run identifier |
| workflow | ref | Which workflow executed |
| trigger | string | What triggered the run |
| status | enum | pending, running, success, failure |
| started_at | timestamp | When the run began |
| completed_at | timestamp | When the run finished |
| jobs | array | Individual job results |

### Job Result

Represents the outcome of a single job within a pipeline run.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Job identifier |
| status | enum | queued, running, success, failure |
| duration | duration | Time taken to complete |
| steps | array | Individual step results |

### Step Result

Represents the outcome of a single step within a job.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Step identifier |
| status | enum | success, failure, skipped |
| duration | duration | Time taken |
| output | string | Step output (if any) |

## Relationships

```
Pipeline Configuration
    └── triggers Pipeline Run (1:many)
            └── contains Job Result (1:many)
                    └── contains Step Result (1:many)
```

## Validation Rules

- Pipeline must have at least one trigger
- Jobs execute in dependency order
- Secrets must be present for deployment jobs
- Coverage must meet threshold (70%) for PR merges
- All jobs must succeed for pipeline to be successful

## Notes

- No database storage required (GitHub manages state)
- Workflow YAML files are the source of truth
- Run history is managed by GitHub Actions
