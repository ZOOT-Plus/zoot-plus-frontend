#!/usr/bin/env sh
# Run resource update scripts in parallel, and fail if any of them fails.

status=0

pnpm scripts:update-operators &
update_operators_pid=$!

pnpm scripts:update-operator-avatars &
update_avatars_pid=$!

pnpm scripts:update-prof-icons &
update_prof_icons_pid=$!

wait "$update_operators_pid" || status=1
wait "$update_avatars_pid" || status=1
wait "$update_prof_icons_pid" || status=1

exit "$status"
