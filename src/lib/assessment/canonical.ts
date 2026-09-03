/** Compatibility helpers for duplicated legacy transfer rows. */
export type LegacyAssessment = {
  id: bigint;
  assessorId: bigint;
  score: number | null;
  updatedAt?: Date | null;
};
export type LegacyTransfer<T extends LegacyAssessment> = {
  id: bigint;
  assessments: readonly T[];
};
export type CanonicalTransfer<T> = {
  transfer: T;
  assessment: LegacyAssessment | null;
  duplicateCount: number;
  hasConflictingScores: boolean;
};

function bestAssessment<T extends LegacyAssessment>(
  items: readonly T[],
): T | null {
  return (
    [...items].sort((a, b) => {
      const scored = Number(b.score !== null) - Number(a.score !== null);
      if (scored) return scored;
      const updated =
        (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
      if (updated) return updated;
      return a.id < b.id ? 1 : -1;
    })[0] ?? null
  );
}

export function selectCanonicalTransfer<
  A extends LegacyAssessment,
  T extends LegacyTransfer<A>,
>(transfers: readonly T[], assessorId?: bigint): CanonicalTransfer<T> | null {
  if (!transfers.length) return null;
  const candidates = transfers.map((transfer) => ({
    transfer,
    assessment: bestAssessment(
      assessorId === undefined
        ? transfer.assessments
        : transfer.assessments.filter((a) => a.assessorId === assessorId),
    ),
  }));
  candidates.sort((a, b) => {
    const rank = (value: LegacyAssessment | null) =>
      value?.score !== null && value ? 2 : value ? 1 : 0;
    return (
      rank(b.assessment) - rank(a.assessment) ||
      (a.transfer.id < b.transfer.id ? -1 : 1)
    );
  });
  const scores = new Set(
    candidates.flatMap(({ assessment }) =>
      assessment?.score == null ? [] : [assessment.score],
    ),
  );
  return {
    transfer: candidates[0].transfer,
    assessment: candidates[0].assessment,
    duplicateCount: transfers.length - 1,
    hasConflictingScores: scores.size > 1,
  };
}
