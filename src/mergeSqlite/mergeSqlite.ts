import DatabaseConstructor from 'better-sqlite3'
import { iamCollectVersion } from '../config/packageVersion.js'
import { SqliteAwsIamStore } from '../persistence/sqlite/SqliteAwsIamStore.js'

/**
 * Merge one or more SQLite databases (created with the same schema as SqliteAwsIamStore)
 * into a single target database. If the target DB does not exist, it will be created.
 *
 * Does not reindex the target database.
 *
 * The function is safe to call repeatedly with different source sets against the
 * same target. We use INSERT OR REPLACE so primary keys prevent duplication while
 * allowing newer rows to overwrite older ones.
 *
 * @param targetPath - The path to the target SQLite database file. If this does not exist it is created.
 * @param sourcePaths - An array of paths to the source SQLite database files.
 */
export async function mergeSqliteDatabases(targetPath: string, sourcePaths: string[]) {
  const TargetDB = new DatabaseConstructor(targetPath)

  try {
    const version = await iamCollectVersion()
    // Ensure the target has the required schema. This mirrors SqliteAwsIamStore.init()
    const schema = SqliteAwsIamStore.schemaSql(version)

    TargetDB.exec(schema)

    const attach = TargetDB.prepare('ATTACH ? AS src')
    const detach = TargetDB.prepare('DETACH src')

    const tables = [
      'resource_metadata',
      'account_metadata',
      'organization_metadata',
      'organizational_unit_metadata',
      'organization_policy_metadata',
      'ram_resources'
    ] as const

    for (const srcPath of sourcePaths) {
      // One transaction per source file keeps memory low and performance high
      const tx = TargetDB.transaction(() => {
        attach.run(srcPath)

        for (const t of tables) {
          // Use OR REPLACE so repeated merges do not duplicate and newer data wins on PK
          TargetDB.exec(`INSERT OR REPLACE INTO main.${t} SELECT * FROM src.${t}`)
        }
      })

      try {
        tx() // execute transaction for this source
      } finally {
        detach.run() // detach outside transaction to avoid lock
      }
    }
  } finally {
    TargetDB.close()
  }
}
