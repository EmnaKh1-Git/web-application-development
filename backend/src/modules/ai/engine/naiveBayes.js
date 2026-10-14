/*
 * Classifieur bayésien naïf multinomial (lissage de Laplace).
 * Utilisé pour suggérer la catégorie d'un nouveau produit à partir de son nom et de sa
 * description : le modèle apprend sur le catalogue existant.
 */

/** @param {{ tokens: string[], label: string|number }[]} documents */
export function trainNaiveBayes(documents) {
  const classes = new Map();
  const vocabulary = new Set();
  for (const { tokens, label } of documents) {
    const entry = classes.get(label) ?? { documents: 0, tokenCounts: new Map(), totalTokens: 0 };
    entry.documents += 1;
    for (const token of tokens) {
      vocabulary.add(token);
      entry.tokenCounts.set(token, (entry.tokenCounts.get(token) ?? 0) + 1);
      entry.totalTokens += 1;
    }
    classes.set(label, entry);
  }
  return { classes, vocabulary, documentCount: documents.length };
}

/** Probabilité de chaque classe, de la plus probable à la moins probable. */
export function predictNaiveBayes(model, tokens) {
  const known = tokens.filter((token) => model.vocabulary.has(token));
  const scores = [...model.classes].map(([label, entry]) => {
    let logProbability = Math.log(entry.documents / model.documentCount);
    for (const token of known) {
      const count = entry.tokenCounts.get(token) ?? 0;
      logProbability += Math.log((count + 1) / (entry.totalTokens + model.vocabulary.size));
    }
    return { label, logProbability };
  });
  // Softmax : passage des log-probabilités à des probabilités qui somment à 1
  const max = Math.max(...scores.map((score) => score.logProbability));
  const exps = scores.map((score) => Math.exp(score.logProbability - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return scores
    .map((score, index) => ({
      label: score.label,
      probability: Math.round((exps[index] / total) * 1000) / 1000,
    }))
    .sort((a, b) => b.probability - a.probability)
    .map((prediction) => ({ ...prediction, knownTokens: known.length }));
}

/** Précision en validation croisée « leave-one-out » (chaque document est prédit sans lui). */
export function leaveOneOutAccuracy(documents) {
  if (documents.length < 3) return null;
  let correct = 0;
  documents.forEach((document, index) => {
    const model = trainNaiveBayes(documents.filter((_, other) => other !== index));
    if (predictNaiveBayes(model, document.tokens)[0]?.label === document.label) correct += 1;
  });
  return Math.round((correct / documents.length) * 1000) / 1000;
}
