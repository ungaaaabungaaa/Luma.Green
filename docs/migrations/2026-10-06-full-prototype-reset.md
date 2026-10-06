# Full prototype data reset

> **Status:** completed and verified on 6 October 2026; both deployments paused.

The founder approved deleting all prototype data in Convex development and
production so the refined platform can start with an empty schema and no
old-data migration. This was an intentional destructive reset, not a schema
migration. The export archives remain outside Git at
`.convex/cleanup-2026-10-04/development-before.zip` and
`.convex/cleanup-2026-10-04/production-before.zip` in the original checkout.
Both archives passed ZIP integrity checks before deletion. They contain
database records and the development archive contains stored files. Access to
these archives remains restricted because they include personal data.

| Deployment                           | Before deletion                                                                                             | Deleted                                                  | Verified after deletion                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `glorious-rooster-470` development   | 68 application tables, 1,398 root rows, 14 root profiles, 10 Better Auth tables, 28 component rows, 7 files | 68 root tables, 7 files, unmounted Better Auth component | 0 tables, rows, users, files, functions and crons |
| `outstanding-buzzard-942` production | 35 application tables, 1,074 root rows, 0 root profiles, 7 Better Auth tables, 5 component rows, 0 files    | 35 root tables, unmounted Better Auth component          | 0 tables, rows, users, files, functions and crons |

Both deployments were paused before the final deletion and remain paused.
Development already had an empty deployed schema. Production passed an
empty-backend dry run, then received the empty backend to unmount Better Auth
before its tables were removed. Verification queried each deployment after the
last deletion. The frontend remains a separate Vercel deployment and is not
proof that a backend workflow is available.

The next backend release must deploy the reviewed new schema and functions,
set the correct production variables, and verify that the deployment can be
resumed safely. Keep the gateway-only B2B payment path blocked until a real
provider is chosen and its signed events are tested. Test account creation,
permissions and the new user guide against the empty environment before
claiming the redesigned platform is live.
