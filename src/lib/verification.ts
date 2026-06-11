export type ApplicationFields = {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  governmentWarning: string;
};

export type VerificationStatus = "pass" | "review" | "fail";

export type FieldResult = {
  field: string;
  expected: string;
  found: boolean;
  confidence: number;
  status: VerificationStatus;
  note: string;
};

export type SummaryResult = {
  status: "Likely Compliant" | "Human Review Recommended" | "Needs Review";
  note: string;
};

export type BatchResult = {
  fileName: string;
  ocrText: string;
  results: FieldResult[];
  summary: SummaryResult;
};

export const STANDARD_GOV_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s/g, "");
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const aa = normalize(a);
  const bb = normalize(b);
  if (!aa || !bb) return 0;
  if (aa.includes(bb) || bb.includes(aa)) return 1;

  const distance = levenshtein(aa, bb);
  return Math.max(0, 1 - distance / Math.max(aa.length, bb.length));
}

function bestLineSimilarity(expected: string, ocrText: string): number {
  const lines = ocrText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return similarity(expected, ocrText);

  return Math.max(
    similarity(expected, ocrText),
    ...lines.map(line => similarity(expected, line)),
    ...lines.map((line, index) => similarity(expected, `${line} ${lines[index + 1] ?? ""}`))
  );
}

function evaluateTextField(field: string, expected: string, ocrText: string, strict = false): FieldResult {
  if (!expected.trim()) {
    return {
      field,
      expected,
      found: false,
      confidence: 0,
      status: "review",
      note: "No expected value provided. Enter the application value or skip this field manually."
    };
  }

  const exactish = compact(ocrText).includes(compact(expected));
  const score = exactish ? 1 : bestLineSimilarity(expected, ocrText);
  const status: VerificationStatus = exactish || (!strict && score >= 0.82) ? "pass" : score >= 0.62 ? "review" : "fail";

  return {
    field,
    expected,
    found: status !== "fail",
    confidence: Math.round(score * 100),
    status,
    note:
      status === "pass"
        ? exactish
          ? "Value appears in the label text."
          : "Likely match after fuzzy normalization; formatting differences appear minor."
        : status === "review"
          ? "Possible match detected, but reviewer judgment is recommended."
          : "Expected value was not reliably found in OCR text."
  };
}

function evaluateAlcoholContent(expected: string, ocrText: string): FieldResult {
  const base = evaluateTextField("Alcohol Content", expected, ocrText);
  const expectedNumbers: string[] = expected.match(/\d+(?:\.\d+)?/g) ?? [];
  const ocrNumbers: string[] = ocrText.match(/\d+(?:\.\d+)?/g) ?? [];
  const numberOverlap = expectedNumbers.some(num => ocrNumbers.includes(num));

  if (base.status === "fail" && numberOverlap) {
    return {
      ...base,
      found: true,
      confidence: Math.max(base.confidence, 70),
      status: "review",
      note: "Relevant alcohol-content number was detected, but wording/format needs review."
    };
  }

  return base;
}

function evaluateWarning(expected: string, ocrText: string): FieldResult {
  const warning = expected.trim() || STANDARD_GOV_WARNING;
  const normalizedOcr = normalize(ocrText);
  const hasGovWarningCaps = ocrText.includes("GOVERNMENT WARNING:");
  const hasCorePhrases = ["surgeon general", "pregnancy", "birth defects", "drive a car", "operate machinery", "health problems"].filter(
    phrase => normalizedOcr.includes(phrase)
  ).length;
  const exactish = compact(ocrText).includes(compact(warning));
  const score = exactish ? 1 : Math.min(0.95, (hasCorePhrases / 6) * 0.85 + (hasGovWarningCaps ? 0.1 : 0));
  const status: VerificationStatus = exactish && hasGovWarningCaps ? "pass" : score >= 0.75 ? "review" : "fail";

  return {
    field: "Government Warning",
    expected: warning,
    found: status !== "fail",
    confidence: Math.round(score * 100),
    status,
    note:
      status === "pass"
        ? "Warning text appears complete with required uppercase heading. Bold formatting should still be visually confirmed."
        : status === "review"
          ? "Core warning phrases were detected, but exact wording, capitalization, or bold formatting requires human review."
          : "Mandatory government warning was not reliably detected."
  };
}

export function verifyLabel(fields: ApplicationFields, ocrText: string): FieldResult[] {
  return [
    evaluateTextField("Brand Name", fields.brandName, ocrText),
    evaluateTextField("Class/Type", fields.classType, ocrText),
    evaluateAlcoholContent(fields.alcoholContent, ocrText),
    evaluateTextField("Net Contents", fields.netContents, ocrText),
    evaluateWarning(fields.governmentWarning, ocrText)
  ];
}

export function summarize(results: FieldResult[]): SummaryResult {
  const failures = results.filter(result => result.status === "fail").length;
  const reviews = results.filter(result => result.status === "review").length;

  if (failures > 0) return { status: "Needs Review", note: `${failures} field(s) failed verification.` };
  if (reviews > 0) return { status: "Human Review Recommended", note: `${reviews} field(s) need reviewer judgment.` };
  return { status: "Likely Compliant", note: "All core prototype checks passed." };
}

export function summarizeBatch(batchResults: BatchResult[]): SummaryResult {
  const failedFiles = batchResults.filter(item => item.summary.status === "Needs Review").length;
  const reviewFiles = batchResults.filter(item => item.summary.status === "Human Review Recommended").length;

  if (failedFiles > 0) return { status: "Needs Review", note: `${failedFiles} file(s) contain failed checks.` };
  if (reviewFiles > 0) return { status: "Human Review Recommended", note: `${reviewFiles} file(s) need reviewer judgment.` };
  return { status: "Likely Compliant", note: "All uploaded files passed the prototype checks." };
}
