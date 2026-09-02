# @settingdust/pi-herdr-subagents Documentation

This directory owns durable authority and bounded implementation work for `@settingdust/pi-herdr-subagents`.

- `spec/`: normative behavior, interfaces, lifecycle, and failure contracts.
- `works/`: derived Work entries, Context, Plans, and Tasks for one bounded delivery objective.

Specs are authoritative. Work Context records settled evidence and current state; Plans and Tasks derive from Specs and do not create authority.
