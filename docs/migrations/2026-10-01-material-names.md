# Fill missing material names

Status: implemented and tested locally. Not run on any deployment.

Existing material rows can have names in only English, Hindi and Kannada.
The canonical catalogue now provides all 12 supported languages. Existing
rows need an explicit repair before screens and CSV exports can use those names.

## Change

Deploy `catalogue.fillMissingNames`, then call it with `{}` through an
authenticated administrator session with two-factor authentication enabled.
It looks up the 26 canonical codes through `materials.by_code`. It fills only
absent name keys. Existing names, including custom languages and admin edits,
remain unchanged. Unknown codes and missing rows remain unchanged.

The mutation changes no prices, mass, emission factors, material status, sort
order or issued credits. Each changed row writes `material.namesFilled` to
`auditLog`, with the actor, added locales and before/after name maps. A repeat
call returns `{ updated: 0 }` and writes nothing.

No schema widening or narrowing is needed. This is a bounded data repair.
Do not run `demo:reset` to apply these translations to a live deployment.

## Apply and verify

1. Follow the backup and development checks in [README.md](README.md).
2. Confirm the deployment, then invoke the mutation from the admin session.
3. Check the returned updated count and corresponding audit entries.
4. Read `catalogue.materials` and confirm names for all 12 locales on known codes.
5. Run the mutation again. Confirm zero updates and no new audit entries.

The added translations are machine-drafted. Native speakers must review
material terms before launch. Existing custom text is preserved by the repair.
