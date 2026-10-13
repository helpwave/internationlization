interface LineChange {
  kind: 'context' | 'add' | 'remove',
  text: string,
  oldLine?: number,
  newLine?: number,
}

function splitLines(value: string): string[] {
  if (value.length === 0) return []
  const lines = value.split('\n')
  if (value.endsWith('\n')) lines.pop()
  return lines
}

function lineChanges(before: readonly string[], after: readonly string[]): LineChange[] {
  const beforeCount = before.length
  const afterCount = after.length
  const scores: number[][] = Array.from({ length: beforeCount + 1 }, () => Array<number>(afterCount + 1).fill(0))

  for (let beforeIndex = beforeCount - 1; beforeIndex >= 0; beforeIndex--) {
    for (let afterIndex = afterCount - 1; afterIndex >= 0; afterIndex--) {
      scores[beforeIndex][afterIndex] = before[beforeIndex] === after[afterIndex]
        ? scores[beforeIndex + 1][afterIndex + 1] + 1
        : Math.max(scores[beforeIndex + 1][afterIndex], scores[beforeIndex][afterIndex + 1])
    }
  }

  const changes: LineChange[] = []
  let beforeIndex = 0
  let afterIndex = 0
  let oldLine = 1
  let newLine = 1

  while (beforeIndex < beforeCount && afterIndex < afterCount) {
    if (before[beforeIndex] === after[afterIndex]) {
      changes.push({ kind: 'context', text: before[beforeIndex], oldLine, newLine })
      beforeIndex++
      afterIndex++
      oldLine++
      newLine++
      continue
    }
    if (scores[beforeIndex + 1][afterIndex] >= scores[beforeIndex][afterIndex + 1]) {
      changes.push({ kind: 'remove', text: before[beforeIndex], oldLine })
      beforeIndex++
      oldLine++
      continue
    }
    changes.push({ kind: 'add', text: after[afterIndex], newLine })
    afterIndex++
    newLine++
  }

  while (beforeIndex < beforeCount) {
    changes.push({ kind: 'remove', text: before[beforeIndex], oldLine })
    beforeIndex++
    oldLine++
  }
  while (afterIndex < afterCount) {
    changes.push({ kind: 'add', text: after[afterIndex], newLine })
    afterIndex++
    newLine++
  }

  return changes
}

function groupChanges(changes: readonly LineChange[], context: number): LineChange[][] {
  const changedIndexes = changes
    .map((change, index) => ({ change, index }))
    .filter(item => item.change.kind !== 'context')
    .map(item => item.index)
  if (changedIndexes.length === 0) return []

  const groups: LineChange[][] = []
  let groupStart = changedIndexes[0]
  let groupEnd = changedIndexes[0]

  for (const index of changedIndexes.slice(1)) {
    if (index - groupEnd <= context * 2) {
      groupEnd = index
      continue
    }
    groups.push(changes.slice(Math.max(0, groupStart - context), Math.min(changes.length, groupEnd + context + 1)))
    groupStart = index
    groupEnd = index
  }

  groups.push(changes.slice(Math.max(0, groupStart - context), Math.min(changes.length, groupEnd + context + 1)))
  return groups
}

function formatHunk(lines: readonly LineChange[]): string {
  const oldStart = lines.find(line => line.oldLine !== undefined)?.oldLine ?? 0
  const newStart = lines.find(line => line.newLine !== undefined)?.newLine ?? 0
  const oldCount = lines.filter(line => line.kind !== 'add').length
  const newCount = lines.filter(line => line.kind !== 'remove').length
  const body = lines.map(line => {
    const prefix = line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '
    return `${prefix}${line.text}`
  })
  return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...body].join('\n')
}

export function formatUnifiedDiff(filePath: string, before: string, after: string): string {
  const groups = groupChanges(lineChanges(splitLines(before), splitLines(after)), 3)
  if (groups.length === 0) return ''
  return [`--- ${filePath}`, `+++ ${filePath}`, ...groups.map(group => formatHunk(group))].join('\n')
}

export function describeOutputChange(filePath: string, previous: string | undefined, next: string): string {
  if (previous === next) return `No changes to ${filePath}`
  const diff = formatUnifiedDiff(filePath, previous ?? '', next)
  if (previous === undefined) return `Would create ${filePath}\n${diff}`
  return `Would update ${filePath}\n${diff}`
}
