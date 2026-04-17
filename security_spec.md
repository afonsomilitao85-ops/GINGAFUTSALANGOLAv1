# Security Specification for GingaFutsal

## Data Invariants
1. **User Profiles:** A user can only create and update their own profile (`/users/{uid}`). The `uid` in the document must match the authenticated `request.auth.uid`.
2. **Posts:** Anyone can read posts. Only authenticated users can create posts. A user can only update or delete their own posts. `authorUid` must be immutable and match the creator.
3. **Matches:** Anyone can read matches. Only admins can create or update matches.
4. **Leagues/Teams/Players:** Anyone can read. Only admins can create, update, or delete.
5. **Ads (Marketplace):** Anyone can read. Only authenticated users can create ads. A user can only update or delete their own ads. `authorUid` must match the creator.
6. **Immutable Fields:** `createdAt`, `authorUid`, and `uid` for users must be immutable after creation.
7. **Identity Integrity:** All user-provided UIDs in documents must match the authenticated user's UID.

## The "Dirty Dozen" Payloads (Attacks)

| Attack ID | Collection | Operation | Payload Description | Expected Result |
|-----------|------------|-----------|---------------------|-----------------|
| ATK-01 | users | create | Creating a profile for another user (mismatched UID). | DENIED |
| ATK-02 | users | update | Changing the `role` field from 'user' to 'admin'. | DENIED |
| ATK-03 | posts | update | Updating another user's post. | DENIED |
| ATK-04 | posts | create | Creating a post with a fake `authorUid`. | DENIED |
| ATK-05 | posts | update | Modifying the `authorUid` of an existing post. | DENIED |
| ATK-06 | matches | create | Non-admin trying to create a match. | DENIED |
| ATK-07 | ads | delete | Deleting someone else's marketplace ad. | DENIED |
| ATK-08 | leagues | create | Non-verified user/Non-admin trying to create a league. | DENIED |
| ATK-09 | posts | create | Creating a post with a huge string for `nome` (DoS). | DENIED |
| ATK-10 | posts | create | Creating a post without being authenticated. | DENIED |
| ATK-11 | users | read | Reading another user's profile if it contains PII (e.g., email) - if isolated. | DENIED (if PII isolation applied) |
| ATK-12 | matches | update | Non-admin trying to change the score of a match. | DENIED |

## The Test Runner
I will create `firestore.rules.test.ts` to execute these tests.
