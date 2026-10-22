---
view: components.packages.package-hero
badges:
  - label: Livewire Package
    color: blue
  - label: "{package.latestVersionLabel}"
    color: green
  - label: "{package.license} License"
    color: purple
  - label: "{package.downloadsShort}+ downloads"
    color: blue
eyebrow: "{package.name}"
title: JavaScript widgets
highlight: that know their component
buttons:
  - label: View Full Documentation
    href: "{card.docsUrl}"
    style: primary
    icon: arrow-right
  - label: View on GitHub
    href: "{package.githubUrl}"
    style: ghost
    external: true
install: "{card.install}"
labels:
  copy: Copy
  copied: Copied!
---

Livewire Assistant finds every element you mark with `data-pharaonic`, binds it to the Livewire component that owns it, and runs your integration's mount, update, and cleanup at the right moments, so widgets like Select2 stay in sync with your component without leaks or loops.
