---
view: components.home.faq
badge: FAQ
title: "{package.name}"
highlight: Questions
subtitle: "Quick answers about installing and using {package.name}."
---

## What is {package.name}?

{card.description} It's a free, open-source {technology.name} package by Pharaonic.

## How do I install {package.name}?

Run `composer require {package.composer}` in your project's root directory, then add `@livewireAssistantScripts` to your layout.

## What does {package.name} require?

The latest release requires {package.requiresText}.

## Do I need Node or a build step?

No. The runtime ships prebuilt inside the Composer package and is served by the package. If you bundle your own JavaScript, you can import its ES module build instead.

## Does it include Select2 or other widgets?

No. The core contains no widget code. You bring the widget library and a small integration; the documentation includes a complete Select2 integration.

## Which Livewire versions are supported?

Each Livewire major has its own release line. The documentation's compatibility page lists the exact Livewire, Laravel, and PHP versions each line is tested with.

## Is {package.name} free to use?

Yes. {package.name} is open source under the {package.license} license, so you can use it in personal and commercial projects.

## Where can I find the {package.name} documentation?

Read the [{package.name} documentation]({package.docsUrl}) for setup, the integration API, and examples.

## How do I report a bug or contribute to {package.name}?

Open an issue or a pull request on [GitHub]({package.githubUrl}), or ask in the [Pharaonic Discord](https://discord.gg/XQG9RhvEvf).
