# RAG Evaluation System

Comprehensive evaluation framework for measuring RAG quality.

## Features

### 1. Test Suite (`testCases.ts`)

- 10 predefined test cases covering:
  - Architecture questions
  - Implementation details
  - API behavior
  - Data flow
- Each test case includes:
  - Expected source files
  - Expected concepts to cover
  - Category classification

### 2. Automated Evaluator (`evaluator.ts`)

Measures retrieval and generation quality:

**Source Retrieval Metrics:**

- **Recall**: % of expected files found
- **Precision**: % of retrieved files that were expected
- **Average Similarity**: Mean cosine similarity of sources

**Answer Quality Metrics:**

- **Concept Coverage**: % of expected concepts mentioned
- **Answer Length**: Character count
- **Concepts Covered**: List of found concepts

### 3. LLM-as-Judge (`llmJudge.ts`)

Uses GPT-4 to score answers 1-5 on:

- **Relevance**: Does it answer the question?
- **Accuracy**: Is it technically correct?
- **Completeness**: Covers all aspects?
- **Clarity**: Well-structured and clear?
- **Hallucination**: Any made-up info? (1=lots, 5=none)

### 4. CLI Runner (`cli.ts`)

```bash
# Basic evaluation (recall, precision, concept coverage)
node --env-file=.env --import tsx src/evaluation/cli.ts [repo-name]

# With LLM-as-judge quality scoring
node --env-file=.env --import tsx src/evaluation/cli.ts --judge [repo-name]
```

## Output

### Console Summary

```
🧪 Running 10 test cases...

Testing: How does the embedding generation work?
  ✓ Recall: 100.0%
  ✓ Precision: 60.0%
  ✓ Concept Coverage: 75.0%
  ✓ Duration: 3245ms

...

📊 Evaluation Summary
──────────────────────────────────────────────────
Total Tests: 10
Passed: 8 (80.0%)
Failed: 2

Average Source Recall: 85.5%
Average Source Precision: 72.3%
Average Concept Coverage: 78.9%
Average Duration: 3500ms
Average Quality Score: 4.2/5

✅ Report saved to: evaluation-report-2025-12-11T12-30-45.json
```

### JSON Report

```json
{
  "totalTests": 10,
  "passedTests": 8,
  "failedTests": 2,
  "avgSourceRecall": 0.855,
  "avgSourcePrecision": 0.723,
  "avgConceptCoverage": 0.789,
  "avgDurationMs": 3500,
  "avgQualityScore": 4.2,
  "results": [
    {
      "testCaseId": "tc-001",
      "question": "How does the embedding generation work?",
      "answer": "...",
      "sources": [...],
      "metrics": {
        "sourceRecall": 1.0,
        "sourcePrecision": 0.6,
        "avgSimilarity": 0.78,
        "answerLength": 542,
        "conceptsCovered": ["OpenAI", "text-embedding-3-small", "batch"],
        "conceptCoverage": 0.75
      },
      "qualityScore": {
        "relevance": 5,
        "accuracy": 5,
        "completeness": 4,
        "clarity": 5,
        "hallucination": 5,
        "overallScore": 4.8,
        "reasoning": "Accurate and complete explanation..."
      },
      "durationMs": 3245,
      "timestamp": "2025-12-11T12:30:45.123Z"
    }
  ],
  "timestamp": "2025-12-11T12:30:50.789Z"
}
```

## Pass/Fail Criteria

Tests pass if:

- Source Recall > 50%
- Concept Coverage > 60%

## Use Cases

1. **Before/After Comparisons**: Test impact of changes to chunking, embedding models, or retrieval strategies
2. **Model Selection**: Compare different embedding models or LLMs
3. **Regression Testing**: Ensure RAG quality doesn't degrade over time
4. **Hyperparameter Tuning**: Find optimal chunk sizes, overlap, top-k values

## Extending

Add custom test cases to `testCases.ts`:

```typescript
{
  id: 'tc-custom',
  question: 'Your question here',
  expectedFiles: ['src/your/file.ts'],
  expectedConcepts: ['key', 'concepts', 'to', 'find'],
  category: 'implementation',
}
```
