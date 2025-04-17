export interface UpperTagLike {
  Key?: string
  Value?: string
}

export interface LowerTagLike {
  key?: string
  value?: string
}

export interface TagKeyValue {
  TagKey: string | undefined
  TagValue: string | undefined
}

export type Tags = UpperTagLike[] | LowerTagLike[] | TagKeyValue[] | Record<string, string>

/**
 * Checks if a tag is an UpperTagLike object.
 */
function isUpperTagLike(tag: UpperTagLike | LowerTagLike | TagKeyValue): tag is UpperTagLike {
  return (tag as UpperTagLike).Key !== undefined
}

/**
 * Checks if a tag is a LowerTagLike object.
 */
function isLowerTagLike(tag: UpperTagLike | LowerTagLike | TagKeyValue): tag is LowerTagLike {
  return (tag as LowerTagLike).key !== undefined
}

function isTagKeyValueLike(tag: UpperTagLike | LowerTagLike | TagKeyValue): tag is TagKeyValue {
  return (tag as TagKeyValue).TagKey !== undefined
}

/**
 * Converts a Tags object to a Record<string, string> object. Use it to even out the
 * differences in tag formats between different services.
 *
 * @param tags The tags to convert
 * @returns Returns a Record<string, string> object or undefined if the tags are undefined.
 */
export function convertTagsToRecord(tags: Tags | undefined): Record<string, string> | undefined {
  if (!tags) {
    return undefined
  }
  if (!Array.isArray(tags)) {
    return tags
  }
  const record = tags.reduce(
    (acc, tag) => {
      if (isUpperTagLike(tag) && tag.Key) {
        acc[tag.Key] = tag.Value || ''
      } else if (isLowerTagLike(tag) && tag.key) {
        acc[tag.key] = tag.value || ''
      } else if (isTagKeyValueLike(tag)) {
        acc[tag.TagKey || ''] = tag.TagValue || ''
      }

      return acc
    },
    {} as Record<string, string>
  )

  if (Object.keys(record).length === 0) {
    return undefined
  }

  return record
}
