@php
    $order = request('order', 'livewire-first');
    $registration = request('registration', 'queue');
    $livewire = request('livewire', 'real');
    $turbo = \Illuminate\Support\Str::startsWith($fixture, 'turbo');
    $scriptUrl = route('pharaonic.livewire-assistant.script', ['id' => \Pharaonic\Livewire\Assistant\Script::version()]);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $fixture }}</title>
    <link rel="stylesheet" href="/static/select2.css">
    <script>
        window.fixtureErrors = window.fixtureErrors || [];
        window.addEventListener('pharaonic:assistant:error', function (event) {
            window.fixtureErrors.push({ code: event.detail.code, integration: event.detail.integration, componentId: event.detail.componentId, hasElement: event.detail.element instanceof Element });
        });
    </script>
    <script src="/static/jquery.js"></script>
    <script src="/static/select2.js"></script>
    @if ($turbo)
        <script src="/static/turbolinks.js"></script>
        <script src="/static/integrations.js"></script>
    @endif
    @livewireStyles
</head>
<body>
    @include('fixtures::fixtures.'.$fixture)

    @if (! $turbo && $registration === 'queue')
        <script src="/static/integrations.js"></script>
    @endif

    @if ($livewire === 'fake')
        <script>window.Livewire = { start: function () {} }; window.livewire = window.Livewire;</script>
    @endif

    @if ($order === 'assistant-first')
        @livewireAssistantScripts
    @endif

    @if ($livewire === 'real')
        @livewireScripts
        @if ($turbo)
            <script src="/static/livewire-turbolinks.js" data-turbolinks-eval="false"></script>
        @endif
    @endif

    @if ($order === 'livewire-first')
        @livewireAssistantScripts
        @livewireAssistantScripts
    @endif

    @if (request()->boolean('twice'))
        <script src="{{ $scriptUrl }}"></script>
    @endif

    @if ($order === 'late')
        <script>
            window.addEventListener('load', function () {
                var script = document.createElement('script');
                script.src = @json($scriptUrl);
                document.body.appendChild(script);
            });
        </script>
    @endif

    @if (! $turbo && $registration === 'direct')
        <script src="/static/integrations.js"></script>
    @endif

    @if (! $turbo && $registration === 'late')
        <script>
            window.addEventListener('load', function () {
                setTimeout(function () {
                    var script = document.createElement('script');
                    script.src = '/static/integrations.js';
                    document.body.appendChild(script);
                }, 50);
            });
        </script>
    @endif
</body>
</html>
