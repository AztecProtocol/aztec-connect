# Pull Request Checklist

To ensure timely merging of any pull request, please follow the steps below.

- Branch has been interactively rebased to cleanup commit history and move to HEAD of master.
- Branch owner has gone through the diff on github line by line by to ensure sensible line endings, no binaries
  committed, no gratuitous debug logging, etc.
- A brief explanation of what the PR does as been written on the "conversation" tab.
- Circle CI has been checked and all tests are passing.
- Finally, once all the above is done, one or more reviewers should be assigned.
- Once approval to merge is finally given, it maybe desirable to do another rebase cleanup (but not before approval).

### Merge Strategy

Generally speaking, the preferred approach to merging should be rebasing. An article here discusses the differences
between merging and rebasing, the pros and cons, the do's and don'ts.

https://www.atlassian.com/git/tutorials/merging-vs-rebasing

The reason to favour rebasing is a cleaner, easier to follow repository history, which can be vital when it comes
to debugging or reverting issues that make it to production.

Technically, rebasing your branch against master will replay each of your commits against master. This works best
when your branches are small and short lived. If not short lived, at least rebasing against master daily will keep
you on top of divergence conflicts. Keeping the branch itself short and clean with interactive rebases can help you
avoid the following scenario.

- Master is ahead with commit A.
- Branch changes line conflicting with A in B.
- Branch changes line conflicting with A in C.

In this scenario, you will end up resolving a merge conflict twice, once when B is applied, and again when C is applied.
This can become even more painful if B and C are editing the same line. The resolution in B will likely conflict with C.
However this is the developers fault for having a messy branch. Squash B and C into a single sensible commit before
rebasing against master.

You should also avoid merging master into your branch as that will likely result in conflicts once rebasing.

Of course, the world is imperfect, and in the event that rebasing becomes unfeasible we should fall back on standard
merges.

### Interactive Rebases

Once a branch is nearing completion there will often be messy commits. "Fix". "Typo". "Linting". etc. It's worth using
gits interactive rebase feature (usually just `git rebase -i master`), to fixup, rearrange and squash commits into
clear steps. This will also simplify the rebasing against master as it reduces the number of commits to be replayed,
and thus the potential for resolving conflicts more than once.

If your branch is long lived (which we should be trying to avoid), you may wish to perform this daily, to ensure your
branch does not diverge significantly from master.

### Reviewers

Once all the above checks have been performed and you feel it's ready for review, you can assign it to @charlielye
for a general code review. If there is maths involved or cryptographic security that needs review, be sure to also
assign someone suitable.

### Final Rebase

If during review a lot of new commits were made, it maybe desirable to do a final interactive rebase to cleanup those
commits. Do _not_ do this during the PR review process, or it will mess up the review.
