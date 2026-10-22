---
name: Livewire Assistant

action:
  label: View on Packagist
  href: "{package.packagistUrl}"

views: components.packages

breadcrumbs:
  - label: Home
    href: route:home
  - label: Packages
    href: route:packages.index
  - label: "{technology.name} Packages"
    href: "url:/packages/{technology.slug}"
  - label: "{package.name}"

card:
  topic: javascript
  icon: switch
  tags: livewire javascript widgets select2 integration lifecycle bridge
  description: A shared Blade and JavaScript foundation that binds JavaScript widgets such as Select2 to Livewire components, with correct ownership, two-way sync, and automatic cleanup.

seo:
  title: "{package.fullName} - Bind JavaScript Widgets to Livewire"
  description: "{package.name} binds JavaScript widgets such as Select2 to Livewire components: discovery, ownership, two-way sync, and cleanup. {package.downloadsShort}+ downloads, {package.license} licensed."
  keywords: livewire, livewire javascript, livewire select2, livewire widgets, wire:ignore, laravel livewire integration
  author: Pharaonic
  images:
    - "{package.cover}"
  openGraph:
    type: website
    siteName: Pharaonic
  twitter:
    card: summary_large_image

schema:
  "@type": SoftwareSourceCode
  name: "{package.name}"
  description: "{package.name} is a Livewire package that binds JavaScript widgets to Livewire components."
  image: "{package.cover}"
  codeRepository: "{package.githubUrl}"
  programmingLanguage: JavaScript
  runtimePlatform: "{technology.name}"
  version: "{package.version}"
  datePublished: "{package.publishedAt}"
  dateModified: "{package.updatedAt}"
  license: "https://opensource.org/licenses/{package.license}"
  isAccessibleForFree: true
  sameAs:
    - "{package.githubUrl}"
    - "{package.packagistUrl}"
  author:
    "@id": url:/#organization
  publisher:
    "@id": url:/#organization
  interactionStatistic:
    "@type": InteractionCounter
    interactionType: https://schema.org/DownloadAction
    userInteractionCount: "{package.downloads}"
---
