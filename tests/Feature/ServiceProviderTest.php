<?php

declare(strict_types=1);

use Pharaonic\Livewire\Assistant\AssistantServiceProvider;

it('registers the service provider', function () {
    expect($this->app->getProviders(AssistantServiceProvider::class))->not->toBeEmpty();
});

it('is auto-discovered by Laravel', function () {
    $composer = json_decode((string) file_get_contents(__DIR__.'/../../composer.json'), true);

    expect($composer['extra']['laravel']['providers'])->toBe([AssistantServiceProvider::class]);
});

it('registers the script route', function () {
    expect(route('pharaonic.livewire-assistant.script', [], false))->toBe('/pharaonic/livewire-assistant/assistant.js');
});
