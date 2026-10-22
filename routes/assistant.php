<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Pharaonic\Livewire\Assistant\Script;
use Pharaonic\Livewire\Assistant\ScriptController;

Route::get('pharaonic/livewire-assistant/assistant.js', ScriptController::class)->name(Script::ROUTE);
