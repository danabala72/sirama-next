export type ReportKind = "formal" | "nonformal" | "final";

export type AssessorScore = {
  assessorId: bigint;
  formal: number | null;
  nonformal: number | null;
};

export type FinalScore = {
  assessorScores: Array<number | null>;
  average: number | null;
  complete: boolean;
  filledAssessors: number;
};

function scoreForKind(item: AssessorScore, kind: ReportKind) {
  if (kind === "formal") return item.formal;
  if (kind === "nonformal") return item.nonformal;
  if (item.formal !== null)
    return Math.min(item.formal + (item.nonformal ?? 0) * 0.1, 85);
  if (item.nonformal !== null) return Math.min(item.nonformal, 85);
  return null;
}

/**
 * Keeps the configured assessor order and distinguishes zero from missing.
 * A final assessment is complete only when all three assigned assessors have
 * a score for the requested report kind.
 */
export function calculateThreeAssessorScore(
  assignedAssessorIds: readonly bigint[],
  scores: readonly AssessorScore[],
  kind: ReportKind,
): FinalScore {
  const assessorIds = assignedAssessorIds.slice(0, 3);
  const indexed = new Map(
    scores.map((score) => [score.assessorId.toString(), score]),
  );
  const assessorScores = assessorIds.map((id) => {
    const item = indexed.get(id.toString());
    return item ? scoreForKind(item, kind) : null;
  });
  const filled = assessorScores.filter(
    (value): value is number => value !== null,
  );

  return {
    assessorScores,
    average: filled.length
      ? Math.round(
          (filled.reduce((sum, value) => sum + value, 0) / filled.length) * 100,
        ) / 100
      : null,
    complete: assessorIds.length === 3 && filled.length === 3,
    filledAssessors: filled.length,
  };
}
