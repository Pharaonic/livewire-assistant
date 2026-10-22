<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Blade;
use Pharaonic\Livewire\Assistant\Script;

function renderBlade(string $template, array $data = []): string
{
    $path = tempnam(sys_get_temp_dir(), 'assistant').'.blade.php';

    file_put_contents($path, $template);

    try {
        return view()->file($path, $data)->render();
    } finally {
        unlink($path);
    }
}

it('renders the runtime script tag', function () {
    $html = renderBlade('@livewireAssistantScripts');

    expect($html)->toBe('<script src="http://localhost/pharaonic/livewire-assistant/assistant.js?id='.Script::version().'" data-turbo-eval="false" data-turbolinks-eval="false"></script>');
});

it('renders once across the page and its partials', function () {
    $directory = sys_get_temp_dir().'/assistant-views-'.uniqid();

    mkdir($directory);
    file_put_contents($directory.'/partial.blade.php', '@livewireAssistantScripts');
    file_put_contents($directory.'/page.blade.php', "@livewireAssistantScripts\n@include('partial')\n@livewireAssistantScripts");

    view()->addLocation($directory);

    try {
        $html = view('page')->render();
    } finally {
        array_map('unlink', glob($directory.'/*.blade.php') ?: []);
        rmdir($directory);
    }

    expect(substr_count($html, '<script'))->toBe(1);
});

it('adds an escaped CSP nonce', function () {
    $html = renderBlade("@livewireAssistantScripts(['nonce' => \$nonce])", ['nonce' => 'a"b<c>']);

    expect($html)->toContain(' nonce="a&quot;b&lt;c&gt;"')
        ->and($html)->not->toContain('a"b<c>');
});

it('rejects unknown options and a non-string nonce', function (string $options) {
    renderBlade("@livewireAssistantScripts({$options})");
})->with([
    "['nonse' => 'x']",
    "['nonce' => 123]",
])->throws(Exception::class);

it('compiles to the shared once mechanism', function () {
    expect(Blade::compileString('@livewireAssistantScripts'))
        ->toContain("hasRenderedOnce('pharaonic-livewire-assistant')")
        ->toContain("markAsRenderedOnce('pharaonic-livewire-assistant')");
});
