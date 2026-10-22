<?php

declare(strict_types=1);

namespace Pharaonic\Livewire\Assistant;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

final class AssistantServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/assistant.php');

        Blade::directive('livewireAssistantScripts', [Script::class, 'directive']);
    }
}
