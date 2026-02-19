export function isContentChanged(previousSnapshot, currentHash) {
  if (!previousSnapshot) {
    return false;
  }

  return previousSnapshot.contentHash !== currentHash;
}
